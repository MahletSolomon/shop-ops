package repositories

import (
	"context"
	"math"
	domain "shop-ops/Domain"
	"strings"

	"github.com/shopspring/decimal"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// TransactionRepository handles data access for unified transactions view
type TransactionRepository interface {
	GetTransactions(ctx context.Context, filter domain.TransactionFilter) (*domain.TransactionList, error)
}

// MongoTransactionRepository implements TransactionRepository using MongoDB
type MongoTransactionRepository struct {
	salesCollection    *mongo.Collection
	expensesCollection *mongo.Collection
	productsCollection *mongo.Collection
}

// NewTransactionRepository creates a new TransactionRepository instance
func NewTransactionRepository(db *mongo.Database) TransactionRepository {
	return &MongoTransactionRepository{
		salesCollection:    db.Collection("sales"),
		expensesCollection: db.Collection("expenses"),
		productsCollection: db.Collection("products"),
	}
}

// GetTransactions retrieves a unified view of sales and expenses with filtering and pagination
func (r *MongoTransactionRepository) GetTransactions(ctx context.Context, filter domain.TransactionFilter) (*domain.TransactionList, error) {
	// Build aggregation pipeline to combine sales and expenses
	
	// Determine which collections to query based on type filter
	includeSales := filter.Type == nil || *filter.Type == domain.TransactionTypeSale
	includeExpenses := filter.Type == nil || *filter.Type == domain.TransactionTypeExpense

	var allTransactions []*domain.Transaction
	var totalSalesCount int64
	var totalExpensesCount int64

	// Query sales if needed
	if includeSales && (filter.Category == nil || *filter.Category == "") {
		salesTxns, salesCount, err := r.getSalesTransactions(ctx, filter)
		if err != nil {
			return nil, err
		}
		allTransactions = append(allTransactions, salesTxns...)
		totalSalesCount = salesCount
	}

	// Query expenses if needed
	if includeExpenses && filter.ProductID == nil {
		expensesTxns, expensesCount, err := r.getExpensesTransactions(ctx, filter)
		if err != nil {
			return nil, err
		}
		allTransactions = append(allTransactions, expensesTxns...)
		totalExpensesCount = expensesCount
	}

	totalRecords := totalSalesCount + totalExpensesCount

	// Sort combined results
	sortTransactions(allTransactions, filter.Sort, filter.Order)

	// Apply pagination to combined results
	start := (filter.Page - 1) * filter.Limit
	end := start + filter.Limit
	if start > len(allTransactions) {
		start = len(allTransactions)
	}
	if end > len(allTransactions) {
		end = len(allTransactions)
	}
	paginatedResults := allTransactions[start:end]

	// Calculate pagination info
	totalPages := int(math.Ceil(float64(totalRecords) / float64(filter.Limit)))
	if totalPages < 1 {
		totalPages = 1
	}

	return &domain.TransactionList{
		Data: paginatedResults,
		Pagination: domain.TransactionPagination{
			CurrentPage:  filter.Page,
			TotalPages:   totalPages,
			TotalRecords: totalRecords,
			PerPage:      filter.Limit,
		},
	}, nil
}

// getSalesTransactions retrieves sales as transactions
func (r *MongoTransactionRepository) getSalesTransactions(ctx context.Context, filter domain.TransactionFilter) ([]*domain.Transaction, int64, error) {
	// Build match stage
	matchStage := bson.M{
		"business_id": filter.BusinessID,
	}

	if !filter.IncludeVoided {
		matchStage["is_voided"] = false
	}

	// Date filter
	if filter.StartDate != nil || filter.EndDate != nil {
		dateFilter := bson.M{}
		if filter.StartDate != nil {
			dateFilter["$gte"] = filter.StartDate
		}
		if filter.EndDate != nil {
			dateFilter["$lte"] = filter.EndDate
		}
		matchStage["created_at"] = dateFilter
	}

	// Product filter
	if filter.ProductID != nil {
		matchStage["product_id"] = filter.ProductID
	}

	// Amount filter
	if filter.MinAmount != nil || filter.MaxAmount != nil {
		amountFilter := bson.M{}
		if filter.MinAmount != nil {
			amountFilter["$gte"] = filter.MinAmount.InexactFloat64()
		}
		if filter.MaxAmount != nil {
			amountFilter["$lte"] = filter.MaxAmount.InexactFloat64()
		}
		matchStage["total"] = amountFilter
	}

	// Count total
	totalCount, err := r.salesCollection.CountDocuments(ctx, matchStage)
	if err != nil {
		return nil, 0, err
	}

	// Aggregation pipeline with product lookup
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: matchStage}},
		{{Key: "$lookup", Value: bson.M{
			"from":         "products",
			"localField":   "product_id",
			"foreignField": "_id",
			"as":           "product",
		}}},
		{{Key: "$unwind", Value: bson.M{
			"path":                       "$product",
			"preserveNullAndEmptyArrays": true,
		}}},
		{{Key: "$project", Value: bson.M{
			"_id":          1,
			"type":         bson.M{"$literal": "sale"},
			"date":         "$created_at",
			"amount":       "$total",
			"product_id":   1,
			"product_name": "$product.name",
			"category":     bson.M{"$literal": nil},
			"description":  bson.M{"$concat": bson.A{"Sale of ", bson.M{"$ifNull": bson.A{"$product.name", "product"}}}},
			"created_at":   1,
		}}},
	}

	cursor, err := r.salesCollection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var transactions []*domain.Transaction
	for cursor.Next(ctx) {
		var result struct {
			ID          primitive.ObjectID  `bson:"_id"`
			Type        string              `bson:"type"`
			Date        primitive.DateTime  `bson:"date"`
			Amount      float64             `bson:"amount"`
			ProductID   *primitive.ObjectID `bson:"product_id"`
			ProductName *string             `bson:"product_name"`
			Category    *string             `bson:"category"`
			Description string              `bson:"description"`
			CreatedAt   primitive.DateTime  `bson:"created_at"`
		}
		if err := cursor.Decode(&result); err != nil {
			continue
		}

		var productIDStr *string
		if result.ProductID != nil {
			str := result.ProductID.Hex()
			productIDStr = &str
		}

		transactions = append(transactions, &domain.Transaction{
			ID:          result.ID.Hex(),
			Type:        domain.TransactionTypeSale,
			Date:        result.Date.Time(),
			Amount:      decimalFromFloat(result.Amount),
			ProductID:   productIDStr,
			ProductName: result.ProductName,
			Category:    result.Category,
			Description: result.Description,
			CreatedAt:   result.CreatedAt.Time(),
		})
	}

	// Apply search filter if provided
	if filter.Search != "" {
		transactions = filterBySearch(transactions, filter.Search)
	}

	return transactions, totalCount, nil
}

// getExpensesTransactions retrieves expenses as transactions
func (r *MongoTransactionRepository) getExpensesTransactions(ctx context.Context, filter domain.TransactionFilter) ([]*domain.Transaction, int64, error) {
	// Build match stage
	matchStage := bson.M{
		"business_id": filter.BusinessID,
	}

	if !filter.IncludeVoided {
		matchStage["is_voided"] = false
	}

	// Date filter
	if filter.StartDate != nil || filter.EndDate != nil {
		dateFilter := bson.M{}
		if filter.StartDate != nil {
			dateFilter["$gte"] = filter.StartDate
		}
		if filter.EndDate != nil {
			dateFilter["$lte"] = filter.EndDate
		}
		matchStage["created_at"] = dateFilter
	}

	// Category filter
	if filter.Category != nil && *filter.Category != "" {
		matchStage["category"] = *filter.Category
	}

	// Amount filter
	if filter.MinAmount != nil || filter.MaxAmount != nil {
		amountFilter := bson.M{}
		if filter.MinAmount != nil {
			amountFilter["$gte"] = filter.MinAmount.InexactFloat64()
		}
		if filter.MaxAmount != nil {
			amountFilter["$lte"] = filter.MaxAmount.InexactFloat64()
		}
		matchStage["amount"] = amountFilter
	}

	// Count total
	totalCount, err := r.expensesCollection.CountDocuments(ctx, matchStage)
	if err != nil {
		return nil, 0, err
	}

	// Aggregation pipeline
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: matchStage}},
		{{Key: "$project", Value: bson.M{
			"_id":          1,
			"type":         bson.M{"$literal": "expense"},
			"date":         "$created_at",
			"amount":       1,
			"product_id":   bson.M{"$literal": nil},
			"product_name": bson.M{"$literal": nil},
			"category":     1,
			"description":  "$note",
			"created_at":   1,
		}}},
	}

	cursor, err := r.expensesCollection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var transactions []*domain.Transaction
	for cursor.Next(ctx) {
		var result struct {
			ID          primitive.ObjectID `bson:"_id"`
			Type        string             `bson:"type"`
			Date        primitive.DateTime `bson:"date"`
			Amount      float64            `bson:"amount"`
			ProductID   *string            `bson:"product_id"`
			ProductName *string            `bson:"product_name"`
			Category    string             `bson:"category"`
			Description string             `bson:"description"`
			CreatedAt   primitive.DateTime `bson:"created_at"`
		}
		if err := cursor.Decode(&result); err != nil {
			continue
		}

		category := result.Category
		transactions = append(transactions, &domain.Transaction{
			ID:          result.ID.Hex(),
			Type:        domain.TransactionTypeExpense,
			Date:        result.Date.Time(),
			Amount:      decimalFromFloat(result.Amount),
			ProductID:   nil,
			ProductName: nil,
			Category:    &category,
			Description: result.Description,
			CreatedAt:   result.CreatedAt.Time(),
		})
	}

	// Apply search filter if provided
	if filter.Search != "" {
		transactions = filterBySearch(transactions, filter.Search)
	}

	return transactions, totalCount, nil
}

// Helper functions

func decimalFromFloat(f float64) decimal.Decimal {
	return decimal.NewFromFloat(f)
}

func sortTransactions(transactions []*domain.Transaction, sortField, order string) {
	if len(transactions) <= 1 {
		return
	}

	// Sort in-place
	for i := 0; i < len(transactions)-1; i++ {
		for j := i + 1; j < len(transactions); j++ {
			shouldSwap := false

			switch sortField {
			case "amount":
				if order == "desc" {
					shouldSwap = transactions[i].Amount.LessThan(transactions[j].Amount)
				} else {
					shouldSwap = transactions[i].Amount.GreaterThan(transactions[j].Amount)
				}
			default: // date
				if order == "desc" {
					shouldSwap = transactions[i].Date.Before(transactions[j].Date)
				} else {
					shouldSwap = transactions[i].Date.After(transactions[j].Date)
				}
			}

			if shouldSwap {
				transactions[i], transactions[j] = transactions[j], transactions[i]
			}
		}
	}
}

func filterBySearch(transactions []*domain.Transaction, search string) []*domain.Transaction {
	if search == "" {
		return transactions
	}

	var filtered []*domain.Transaction
	searchLower := strings.ToLower(search)

	for _, txn := range transactions {
		// Search in description
		if strings.Contains(strings.ToLower(txn.Description), searchLower) {
			filtered = append(filtered, txn)
			continue
		}
		// Search in category
		if txn.Category != nil && strings.Contains(strings.ToLower(*txn.Category), searchLower) {
			filtered = append(filtered, txn)
			continue
		}
		// Search in product name
		if txn.ProductName != nil && strings.Contains(strings.ToLower(*txn.ProductName), searchLower) {
			filtered = append(filtered, txn)
			continue
		}
	}

	return filtered
}
