package repositories

import (
	"context"
	domain "shop-ops/Domain"
	"time"

	"github.com/shopspring/decimal"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

//ExpenseFilter

type ExpenseFilter struct {
	BusinessID    primitive.ObjectID
	StartDate     *time.Time
	EndDate       *time.Time
	Category      *domain.ExpenseCategory
	MinAmount     *decimal.Decimal
	MaxAmount     *decimal.Decimal
	IncludeVoided bool
	Page          int
	Limit         int
	Sort          string
	Order         string
}

func (e ExpenseFilter) SetCategory(category domain.ExpenseCategory) {
	panic("unimplemented")
}

//ExpenseRepository 

type ExpenseRepository interface {
	Create(ctx context.Context, expense *domain.Expense) error
	GetByID(ctx context.Context, id primitive.ObjectID) (*domain.Expense, error)
	GetByBusinessID(ctx context.Context, filter ExpenseFilter) ([]*domain.Expense, int64, error)
	Update(ctx context.Context, expense *domain.Expense) error
	Void(ctx context.Context, id primitive.ObjectID) error
	GetSummaryByCategory(ctx context.Context, businessID primitive.ObjectID, startDate, endDate *time.Time) (map[domain.ExpenseCategory]decimal.Decimal, decimal.Decimal, error)
}

// MongoExpenseRepository 
type MongoExpenseRepository struct {
	collection *mongo.Collection
}

// NewExpenseRepository 
func NewExpenseRepository(db *mongo.Database) ExpenseRepository {
	return &MongoExpenseRepository{
		collection: db.Collection("expenses"),
	}
}

// Create inserts a new expense into the database
func (r *MongoExpenseRepository) Create(ctx context.Context, expense *domain.Expense) error {
	_, err := r.collection.InsertOne(ctx, expense)
	return err
}

// GetByID r
func (r *MongoExpenseRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*domain.Expense, error) {
	var expense domain.Expense
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&expense)
	if err == mongo.ErrNoDocuments {
		return nil, domain.ErrExpenseNotFound
	}
	return &expense, err
}

// GetByBusinessID retrieves expenses for a business with filtering and pagination
func (r *MongoExpenseRepository) GetByBusinessID(ctx context.Context, filter ExpenseFilter) ([]*domain.Expense, int64, error) {
	// Build query filter
	query := bson.M{
		"business_id": filter.BusinessID,
	}

	if !filter.IncludeVoided {
		query["is_voided"] = false
	}

	// Date range filter
	if filter.StartDate != nil || filter.EndDate != nil {
		dateFilter := bson.M{}
		if filter.StartDate != nil {
			dateFilter["$gte"] = filter.StartDate
		}
		if filter.EndDate != nil {
			dateFilter["$lte"] = filter.EndDate
		}
		query["created_at"] = dateFilter
	}

	// Category filter
	if filter.Category != nil {
		query["category"] = *filter.Category
	}

	// Amount range filter
	if filter.MinAmount != nil || filter.MaxAmount != nil {
		amountFilter := bson.M{}
		if filter.MinAmount != nil {
			amountFilter["$gte"] = filter.MinAmount.String()
		}
		if filter.MaxAmount != nil {
			amountFilter["$lte"] = filter.MaxAmount.String()
		}
		query["amount"] = amountFilter
	}

	// Count total documents
	total, err := r.collection.CountDocuments(ctx, query)
	if err != nil {
		return nil, 0, err
	}

	// Pagination options
	opts := options.Find()

	// Set pagination
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 {
		filter.Limit = 50
	}
	skip := int64((filter.Page - 1) * filter.Limit)
	opts.SetSkip(skip)
	opts.SetLimit(int64(filter.Limit))

	// Set sorting
	sortOrder := 1 // asc
	if filter.Order == "desc" {
		sortOrder = -1
	}

	sortField := "created_at"
	if filter.Sort != "" {
		switch filter.Sort {
		case "date":
			sortField = "created_at"
		case "amount":
			sortField = "amount"
		case "category":
			sortField = "category"
		default:
			sortField = filter.Sort
		}
	}
	opts.SetSort(bson.D{{Key: sortField, Value: sortOrder}})

	// Execute query
	cursor, err := r.collection.Find(ctx, query, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var expenses []*domain.Expense
	if err = cursor.All(ctx, &expenses); err != nil {
		return nil, 0, err
	}

	return expenses, total, nil
}

// Update replaces an existing expense
func (r *MongoExpenseRepository) Update(ctx context.Context, expense *domain.Expense) error {
	result, err := r.collection.ReplaceOne(
		ctx,
		bson.M{"_id": expense.ID},
		expense,
	)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return domain.ErrExpenseNotFound
	}
	return nil
}

// Void soft-deletes an expense by setting IsVoided to true
func (r *MongoExpenseRepository) Void(ctx context.Context, id primitive.ObjectID) error {
	update := bson.M{
		"$set": bson.M{
			"is_voided": true,
		},
	}
	result, err := r.collection.UpdateOne(ctx, bson.M{"_id": id}, update)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return domain.ErrExpenseNotFound
	}
	return nil
}

// GetSummaryByCategory aggregates expenses by category
func (r *MongoExpenseRepository) GetSummaryByCategory(ctx context.Context, businessID primitive.ObjectID, startDate, endDate *time.Time) (map[domain.ExpenseCategory]decimal.Decimal, decimal.Decimal, error) {
    // Aggregation pipeline
    pipeline := bson.A{
        bson.M{
            "$match": bson.M{
                "business_id": businessID,
                "is_voided":   false,
            },
        },
    }

    // Add date filter if provided 
    if startDate != nil || endDate != nil {
        dateMatch := bson.M{}
        if startDate != nil {
            dateMatch["$gte"] = *startDate  
        }
        if endDate != nil {
           
            endOfDay := endDate.Add(24*time.Hour - time.Second)
            dateMatch["$lte"] = endOfDay    
        }
        pipeline = append(pipeline, bson.M{
            "$match": bson.M{"created_at": dateMatch},
        })
    }

    // Group by category
    pipeline = append(pipeline, bson.M{
        "$group": bson.M{
            "_id":   "$category",
            "total": bson.M{"$sum": bson.M{"$toDecimal": "$amount"}},
        },
    })

    cursor, err := r.collection.Aggregate(ctx, pipeline)
    if err != nil {
        return nil, decimal.Zero, err
    }
    defer cursor.Close(ctx)

    summary := make(map[domain.ExpenseCategory]decimal.Decimal)
    grandTotal := decimal.Zero

    for cursor.Next(ctx) {
        var result struct {
            ID    string          `bson:"_id"`
            Total decimal.Decimal `bson:"total"`
        }
        if err := cursor.Decode(&result); err != nil {
            continue
        }
        category := domain.ExpenseCategory(result.ID)
        summary[category] = result.Total
        grandTotal = grandTotal.Add(result.Total)
    }

    // Add categories with zero amount
    for _, category := range domain.GetAllExpenseCategories() {
        if _, exists := summary[category]; !exists {
            summary[category] = decimal.Zero
        }
    }

    return summary, grandTotal, nil
}