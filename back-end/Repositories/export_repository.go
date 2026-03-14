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

// ExportRepository handles data access for export requests
type ExportRepository struct {
	collection *mongo.Collection
}

// NewExportRepository creates a new ExportRepository backed by the "exports" collection
func NewExportRepository(db *mongo.Database) Domain.ExportRepository {
	return &ExportRepository{
		collection: db.Collection("exports"),
	}
}

// Create inserts a new export request into the database
func (r *ExportRepository) Create(request *Domain.ExportRequest) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	request.CreatedAt = time.Now()
	request.UpdatedAt = time.Now()

	// Convert domain string ID to primitive.ObjectID (if empty, insert will create a new one, but we should generate it if needed, or let driver do it if mapped like _id)
	// For this, we'll let mongo generate it and then set the struct.
	// Oh wait, our model has `json:"id" bson:"_id"`.
	// Usually we need `_id,omitempty` or handle it gracefully. Let's create object ID.
	objID := primitive.NewObjectID()
	request.ID = objID.Hex()

	doc := bson.M{
		"_id":         objID,
		"business_id": request.BusinessID,
		"user_id":     request.UserID,
		"type":        request.Type,
		"format":      request.Format,
		"filters":     request.Filters,
		"fields":      request.Fields,
		"status":      request.Status,
		"file_url":    request.FileURL,
		"error":       request.Error,
		"created_at":  request.CreatedAt,
		"updated_at":  request.UpdatedAt,
	}

	_, err := r.collection.InsertOne(ctx, doc)
	if err != nil {
		return fmt.Errorf("failed to create export request: %w", err)
	}

	return nil
}

// GetByID retrieves an export request by ID
func (r *ExportRepository) GetByID(id string, businessID string) (*Domain.ExportRequest, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("invalid export ID: %w", err)
	}

	filter := bson.M{"_id": objID, "business_id": businessID}

	var request Domain.ExportRequest
	err = r.collection.FindOne(ctx, filter).Decode(&request)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil // Return nil, nil if not found
		}
		return nil, fmt.Errorf("failed to find export request: %w", err)
	}

	// Make sure the ID string is populated as hex
	request.ID = objID.Hex()

	return &request, nil
}

// GetByBusiness retrieves paginated export requests for a business
func (r *ExportRepository) GetByBusiness(businessID string, limit, offset int) ([]Domain.ExportRequest, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"business_id": businessID}

	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetSkip(int64(offset)).
		SetLimit(int64(limit))

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to find export requests: %w", err)
	}
	defer cursor.Close(ctx)

	var results []Domain.ExportRequest
	
	// manually decoding to ensure the ID gets mapped properly if using bson:"_id" on string doesn't work out of the box
	for cursor.Next(ctx) {
		var doc bson.M
		if err := cursor.Decode(&doc); err != nil {
			return nil, err
		}
		
		// Map back to struct
		idStr := ""
		if oid, ok := doc["_id"].(primitive.ObjectID); ok {
			idStr = oid.Hex()
		}

		req := Domain.ExportRequest{
			ID:         idStr,
			BusinessID: getString(doc, "business_id"),
			UserID:     getString(doc, "user_id"),
			Type:       getString(doc, "type"),
			Format:     getString(doc, "format"),
			Status:     Domain.ExportStatus(getString(doc, "status")),
			FileURL:    getString(doc, "file_url"),
			Error:      getString(doc, "error"),
		}
		
		// Add times
		if t, ok := doc["created_at"].(primitive.DateTime); ok {
			req.CreatedAt = t.Time()
		}
		if t, ok := doc["updated_at"].(primitive.DateTime); ok {
			req.UpdatedAt = t.Time()
		}

		results = append(results, req)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %w", err)
	}

	return results, nil
}

// CountByBusiness returns the total export requests for a business
func (r *ExportRepository) CountByBusiness(businessID string) (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	count, err := r.collection.CountDocuments(ctx, bson.M{"business_id": businessID})
	if err != nil {
		return 0, fmt.Errorf("failed to count exports: %w", err)
	}

	return count, nil
}

// UpdateStatus updates the status, file URL and error message of an export
func (r *ExportRepository) UpdateStatus(id string, status Domain.ExportStatus, fileURL, errorMessage string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return fmt.Errorf("invalid export ID: %w", err)
	}

	update := bson.M{
		"$set": bson.M{
			"status":     status,
			"file_url":   fileURL,
			"error":      errorMessage,
			"updated_at": time.Now(),
		},
	}

	result, err := r.collection.UpdateByID(ctx, objID, update)
	if err != nil {
		return fmt.Errorf("failed to update export status: %w", err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("export request not found")
	}

	return nil
}

// Helper block to safely get strings from BSON maps
func getString(m bson.M, key string) string {
	if val, ok := m[key].(string); ok {
		return val
	}
	return ""
}
