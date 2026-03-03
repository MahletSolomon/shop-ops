package repositories

import (
	"context"
	"fmt"
	"time"

	Domain "shop-ops/Domain"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// SalesRepository handles data access for sales transactions
type SalesRepository struct {
	collection *mongo.Collection
}

// NewSalesRepository creates a new SalesRepository backed by the "sales" collection
func NewSalesRepository(db *mongo.Database) Domain.SaleRepository {
	return &SalesRepository{
		collection: db.Collection("sales"),
	}
}

// Create inserts a new sale document into the database
func (r *SalesRepository) Create(sale *Domain.Sale) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := r.collection.InsertOne(ctx, sale)
	if err != nil {
		return fmt.Errorf("failed to create sale: %w", err)
	}

	sale.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

// FindByID retrieves a sale by its ObjectID hex string
func (r *SalesRepository) FindByID(id string) (*Domain.Sale, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("invalid sale ID: %w", err)
	}

	var sale Domain.Sale
	err = r.collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&sale)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to find sale: %w", err)
	}

	return &sale, nil
}

// FindByBusinessID returns a paginated list of sales for a given business
func (r *SalesRepository) FindByBusinessID(businessID string, query Domain.SaleListQuery) ([]Domain.Sale, int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objBusinessID, err := primitive.ObjectIDFromHex(businessID)
	if err != nil {
		return nil, 0, fmt.Errorf("invalid business ID: %w", err)
	}

	// Base filter: belongs to business, not voided
	filter := bson.M{
		"business_id": objBusinessID,
		"is_voided":   false,
	}

	// Date range filter
	if query.StartDate != "" || query.EndDate != "" {
		dateFilter := bson.M{}
		if query.StartDate != "" {
			if t, err := time.Parse("2006-01-02", query.StartDate); err == nil {
				dateFilter["$gte"] = t
			}
		}
		if query.EndDate != "" {
			if t, err := time.Parse("2006-01-02", query.EndDate); err == nil {
				// Include the full end day
				dateFilter["$lte"] = t.Add(24*time.Hour - time.Second)
			}
		}
		if len(dateFilter) > 0 {
			filter["created_at"] = dateFilter
		}
	}

	// Optional: filter by product
	if query.ProductID != "" {
		if objProductID, err := primitive.ObjectIDFromHex(query.ProductID); err == nil {
			filter["product_id"] = objProductID
		}
	}

	// Amount range filter (based on total field)
	if query.MinAmount > 0 || query.MaxAmount > 0 {
		amountFilter := bson.M{}
		if query.MinAmount > 0 {
			amountFilter["$gte"] = query.MinAmount
		}
		if query.MaxAmount > 0 {
			amountFilter["$lte"] = query.MaxAmount
		}
		if len(amountFilter) > 0 {
			filter["total"] = amountFilter
		}
	}

	// Pagination defaults
	if query.Page < 1 {
		query.Page = 1
	}
	if query.Limit < 1 {
		query.Limit = 50
	}
	skip := (query.Page - 1) * query.Limit

	// Sort
	sortField := query.Sort
	if sortField == "" {
		sortField = "created_at"
	}
	sortOrder := -1 // default desc
	if query.Order == "asc" {
		sortOrder = 1
	}

	// Total count
	total, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count sales: %w", err)
	}

	// Find with pagination
	opts := options.Find().
		SetSort(bson.D{{Key: sortField, Value: sortOrder}}).
		SetSkip(int64(skip)).
		SetLimit(int64(query.Limit))

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to find sales: %w", err)
	}
	defer cursor.Close(ctx)

	var sales []Domain.Sale
	if err := cursor.All(ctx, &sales); err != nil {
		return nil, 0, fmt.Errorf("failed to decode sales: %w", err)
	}

	return sales, total, nil
}

// UpdateNote updates the note of a sale
func (r *SalesRepository) UpdateNote(id string, note string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return fmt.Errorf("invalid sale ID: %w", err)
	}

	update := bson.M{
		"$set": bson.M{
			"note": note,
		},
	}

	result, err := r.collection.UpdateByID(ctx, objID, update)
	if err != nil {
		return fmt.Errorf("failed to update sale: %w", err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("sale not found")
	}

	return nil
}

// VoidSale marks a sale as voided (soft delete)
func (r *SalesRepository) VoidSale(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return fmt.Errorf("invalid sale ID: %w", err)
	}

	update := bson.M{
		"$set": bson.M{
			"is_voided": true,
		},
	}

	result, err := r.collection.UpdateByID(ctx, objID, update)
	if err != nil {
		return fmt.Errorf("failed to void sale: %w", err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("sale not found")
	}

	return nil
}

// GetSummary returns aggregated sales totals for the given period
func (r *SalesRepository) GetSummary(businessID string, startDate, endDate time.Time) (*Domain.SaleSummaryResponse, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objBusinessID, err := primitive.ObjectIDFromHex(businessID)
	if err != nil {
		return nil, fmt.Errorf("invalid business ID: %w", err)
	}

	activeFilter := bson.M{
		"business_id": objBusinessID,
		"is_voided":   false,
		"created_at":  bson.M{"$gte": startDate, "$lte": endDate},
	}
	voidedFilter := bson.M{
		"business_id": objBusinessID,
		"is_voided":   true,
		"created_at":  bson.M{"$gte": startDate, "$lte": endDate},
	}

	activeCount, _ := r.collection.CountDocuments(ctx, activeFilter)
	voidedCount, _ := r.collection.CountDocuments(ctx, voidedFilter)

	// Sum totals from the active sales
	activeCursor, err := r.collection.Find(ctx, activeFilter)
	totalRevenue := 0.0
	if err == nil {
		defer activeCursor.Close(ctx)
		var sales []Domain.Sale
		if err := activeCursor.All(ctx, &sales); err == nil {
			for _, s := range sales {
				totalRevenue += s.Total
			}
		}
	}

	return &Domain.SaleSummaryResponse{
		TotalSales:   int(activeCount),
		TotalRevenue: totalRevenue,
		VoidedCount:  int(voidedCount),
	}, nil
}
