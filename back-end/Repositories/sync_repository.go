package repositories

import (
	"context"
	"errors"
	"math"
	domain "shop-ops/Domain"
	"strings"
	"time"

	"github.com/shopspring/decimal"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	syncStatusCompleted      = "completed"
	syncStatusPartialSuccess = "partial_success"
)

// SyncRepository provides synchronization persistence operations.
type SyncRepository interface {
	ProcessBatch(ctx context.Context, req domain.SyncBatchRequest) (*domain.SyncBatchResponse, error)
	GetStatus(ctx context.Context, businessID, deviceID string) (*domain.SyncStatusResponse, error)
	GetHistory(ctx context.Context, businessID string, page, limit int) (*domain.SyncHistoryResponse, error)
}

// MongoSyncRepository is a MongoDB implementation of SyncRepository.
type MongoSyncRepository struct {
	db        *mongo.Database
	syncLogs  *mongo.Collection
	sales     *mongo.Collection
	expenses  *mongo.Collection
	business  *mongo.Collection
}

// NewSyncRepository creates a SyncRepository backed by MongoDB.
func NewSyncRepository(db *mongo.Database) SyncRepository {
	repo := &MongoSyncRepository{
		db:       db,
		syncLogs: db.Collection("sync_logs"),
		sales:    db.Collection("sales"),
		expenses: db.Collection("expenses"),
		business: db.Collection("businesses"),
	}
	repo.ensureIndexes()
	return repo
}

func (r *MongoSyncRepository) ensureIndexes() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, _ = r.syncLogs.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "business_id", Value: 1}, {Key: "created_at", Value: -1}}},
		{Keys: bson.D{{Key: "device_id", Value: 1}, {Key: "created_at", Value: -1}}},
	})

	_, _ = r.sales.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "business_id", Value: 1}, {Key: "device_id", Value: 1}, {Key: "local_id", Value: 1}},
	})

	_, _ = r.expenses.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "business_id", Value: 1}, {Key: "device_id", Value: 1}, {Key: "local_id", Value: 1}},
	})
}

// ProcessBatch syncs multiple offline transactions in one database transaction.
func (r *MongoSyncRepository) ProcessBatch(ctx context.Context, req domain.SyncBatchRequest) (*domain.SyncBatchResponse, error) {
	businessObjID, err := primitive.ObjectIDFromHex(req.BusinessID)
	if err != nil {
		return nil, errors.New("invalid business_id")
	}

	if err := r.ensureDeviceOwnership(ctx, businessObjID, req.DeviceID); err != nil {
		return nil, err
	}

	session, err := r.db.Client().StartSession()
	if err != nil {
		return nil, err
	}
	defer session.EndSession(ctx)

	syncObjectID := primitive.NewObjectID()
	response := &domain.SyncBatchResponse{
		SyncID:    syncObjectID.Hex(),
		Status:    syncStatusCompleted,
		Timestamp: time.Now().UTC(),
		Results:   make([]domain.SyncItemResult, 0, len(req.Transactions)),
		Summary: domain.SyncSummary{
			Total: len(req.Transactions),
		},
	}

	_, err = session.WithTransaction(ctx, func(sc mongo.SessionContext) (interface{}, error) {
		syncTimestamp := req.SyncTimestamp
		if syncTimestamp.IsZero() {
			syncTimestamp = response.Timestamp
		}

		for _, tx := range req.Transactions {
			result := domain.SyncItemResult{LocalID: tx.LocalID}

			alreadySynced, existingServerID, checkErr := r.findExistingSynced(sc, businessObjID, req.DeviceID, tx.LocalID, tx.Type)
			if checkErr != nil {
				result.Status = "failed"
				result.Message = checkErr.Error()
				response.Summary.Failed++
				response.Results = append(response.Results, result)
				continue
			}
			if alreadySynced {
				result.Status = "already_synced"
				result.ServerID = existingServerID
				result.Message = "duplicate local_id ignored (server wins)"
				response.Summary.Success++
				response.Results = append(response.Results, result)
				continue
			}

			serverID, processErr := r.processSingleTransaction(sc, businessObjID, req.DeviceID, tx)
			if processErr != nil {
				result.Status = "failed"
				result.Message = processErr.Error()
				response.Summary.Failed++
			} else {
				result.Status = "success"
				result.ServerID = serverID
				response.Summary.Success++
			}
			response.Results = append(response.Results, result)
		}

		if response.Summary.Failed > 0 {
			response.Status = syncStatusPartialSuccess
		}

		logDoc := bson.M{
			"_id":            syncObjectID,
			"business_id":    businessObjID,
			"device_id":      req.DeviceID,
			"sync_timestamp": syncTimestamp,
			"status":         response.Status,
			"results":        response.Results,
			"summary":        response.Summary,
			"created_at":     response.Timestamp,
		}
		if _, insertErr := r.syncLogs.InsertOne(sc, logDoc); insertErr != nil {
			return nil, insertErr
		}

		return nil, nil
	})
	if err != nil {
		return nil, err
	}

	if response.Summary.Failed > 0 {
		retryAfterSeconds := 30
		response.RetryAfter = &retryAfterSeconds
	}

	return response, nil
}

// GetStatus returns the latest synchronization state for a business.
func (r *MongoSyncRepository) GetStatus(ctx context.Context, businessID, deviceID string) (*domain.SyncStatusResponse, error) {
	businessObjID, err := primitive.ObjectIDFromHex(businessID)
	if err != nil {
		return nil, errors.New("invalid business_id")
	}

	query := bson.M{"business_id": businessObjID}
	if strings.TrimSpace(deviceID) != "" {
		query["device_id"] = deviceID
	}

	opts := options.FindOne().SetSort(bson.D{{Key: "created_at", Value: -1}})
	var latest struct {
		ID        primitive.ObjectID `bson:"_id"`
		Business  primitive.ObjectID `bson:"business_id"`
		DeviceID  string             `bson:"device_id"`
		Status    string             `bson:"status"`
		CreatedAt time.Time          `bson:"created_at"`
		Summary   struct {
			Success int `bson:"success"`
			Failed  int `bson:"failed"`
		} `bson:"summary"`
	}

	err = r.syncLogs.FindOne(ctx, query, opts).Decode(&latest)
	if err == mongo.ErrNoDocuments {
		return &domain.SyncStatusResponse{
			BusinessID: businessID,
			DeviceID:   deviceID,
		}, nil
	}
	if err != nil {
		return nil, err
	}

	dayAgo := time.Now().UTC().Add(-24 * time.Hour)
	failedLast24h, err := r.syncLogs.CountDocuments(ctx, bson.M{
		"business_id": businessObjID,
		"created_at":  bson.M{"$gte": dayAgo},
		"summary.failed": bson.M{"$gt": 0},
	})
	if err != nil {
		return nil, err
	}

	pendingRetryAgg := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"business_id": businessObjID, "created_at": bson.M{"$gte": dayAgo}}}},
		{{Key: "$unwind", Value: "$results"}},
		{{Key: "$match", Value: bson.M{"results.status": "failed"}}},
		{{Key: "$group", Value: bson.M{"_id": nil, "count": bson.M{"$sum": 1}}}},
	}
	pendingCursor, err := r.syncLogs.Aggregate(ctx, pendingRetryAgg)
	if err != nil {
		return nil, err
	}
	defer pendingCursor.Close(ctx)

	var pendingRetries int64
	if pendingCursor.Next(ctx) {
		var agg struct {
			Count int64 `bson:"count"`
		}
		if decodeErr := pendingCursor.Decode(&agg); decodeErr == nil {
			pendingRetries = agg.Count
		}
	}

	totalSyncedAgg := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"business_id": businessObjID}}},
		{{Key: "$group", Value: bson.M{"_id": nil, "total": bson.M{"$sum": "$summary.success"}}}},
	}
	cursor, err := r.syncLogs.Aggregate(ctx, totalSyncedAgg)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var totalSynced int64
	if cursor.Next(ctx) {
		var agg struct {
			Total int64 `bson:"total"`
		}
		if decodeErr := cursor.Decode(&agg); decodeErr == nil {
			totalSynced = agg.Total
		}
	}

	return &domain.SyncStatusResponse{
		BusinessID:    businessID,
		DeviceID:      latest.DeviceID,
		LastSyncAt:    latest.CreatedAt,
		LastSyncID:    latest.ID.Hex(),
		LastStatus:    latest.Status,
		PendingRetries: pendingRetries,
		TotalSynced:   totalSynced,
		FailedLast24h: failedLast24h,
	}, nil
}

// GetHistory returns paginated synchronization logs for a business.
func (r *MongoSyncRepository) GetHistory(ctx context.Context, businessID string, page, limit int) (*domain.SyncHistoryResponse, error) {
	businessObjID, err := primitive.ObjectIDFromHex(businessID)
	if err != nil {
		return nil, errors.New("invalid business_id")
	}

	query := bson.M{"business_id": businessObjID}
	total, err := r.syncLogs.CountDocuments(ctx, query)
	if err != nil {
		return nil, err
	}

	skip := int64((page - 1) * limit)
	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetSkip(skip).SetLimit(int64(limit))
	cursor, err := r.syncLogs.Find(ctx, query, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	logs := make([]domain.SyncLog, 0)
	for cursor.Next(ctx) {
		var doc struct {
			ID            primitive.ObjectID   `bson:"_id"`
			BusinessID    primitive.ObjectID   `bson:"business_id"`
			DeviceID      string               `bson:"device_id"`
			SyncTimestamp time.Time            `bson:"sync_timestamp"`
			Status        string               `bson:"status"`
			Results       []domain.SyncItemResult `bson:"results"`
			Summary       domain.SyncSummary   `bson:"summary"`
			CreatedAt     time.Time            `bson:"created_at"`
		}
		if err := cursor.Decode(&doc); err != nil {
			continue
		}
		logs = append(logs, domain.SyncLog{
			ID:            doc.ID.Hex(),
			BusinessID:    doc.BusinessID.Hex(),
			DeviceID:      doc.DeviceID,
			SyncTimestamp: doc.SyncTimestamp,
			Status:        doc.Status,
			Results:       doc.Results,
			Summary:       doc.Summary,
			CreatedAt:     doc.CreatedAt,
		})
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	if totalPages < 1 {
		totalPages = 1
	}

	resp := &domain.SyncHistoryResponse{Data: logs}
	resp.Pagination.CurrentPage = page
	resp.Pagination.TotalPages = totalPages
	resp.Pagination.TotalRecords = total
	resp.Pagination.PerPage = limit
	return resp, nil
}

func (r *MongoSyncRepository) ensureDeviceOwnership(ctx context.Context, businessID primitive.ObjectID, deviceID string) error {
	var existing struct {
		SyncDeviceID string `bson:"sync_device_id"`
	}
	err := r.business.FindOne(ctx, bson.M{"_id": businessID}).Decode(&existing)
	if err != nil {
		return err
	}

	if strings.TrimSpace(existing.SyncDeviceID) != "" && existing.SyncDeviceID != deviceID {
		return errors.New("device conflict for business")
	}

	_, err = r.business.UpdateOne(
		ctx,
		bson.M{"_id": businessID, "$or": bson.A{bson.M{"sync_device_id": bson.M{"$exists": false}}, bson.M{"sync_device_id": ""}, bson.M{"sync_device_id": deviceID}}},
		bson.M{"$set": bson.M{"sync_device_id": deviceID, "updated_at": time.Now().UTC()}},
	)
	if err != nil {
		return err
	}
	return nil
}

func (r *MongoSyncRepository) findExistingSynced(ctx context.Context, businessID primitive.ObjectID, deviceID, localID string, txType domain.SyncTransactionType) (bool, string, error) {
	query := bson.M{"business_id": businessID, "device_id": deviceID, "local_id": localID}
	var existing struct {
		ID primitive.ObjectID `bson:"_id"`
	}

	switch txType {
	case domain.SyncTransactionTypeSale:
		err := r.sales.FindOne(ctx, query).Decode(&existing)
		if err == mongo.ErrNoDocuments {
			return false, "", nil
		}
		if err != nil {
			return false, "", err
		}
		return true, existing.ID.Hex(), nil
	case domain.SyncTransactionTypeExpense:
		err := r.expenses.FindOne(ctx, query).Decode(&existing)
		if err == mongo.ErrNoDocuments {
			return false, "", nil
		}
		if err != nil {
			return false, "", err
		}
		return true, existing.ID.Hex(), nil
	default:
		return false, "", errors.New("unsupported transaction type")
	}
}

func (r *MongoSyncRepository) processSingleTransaction(ctx context.Context, businessID primitive.ObjectID, deviceID string, tx domain.SyncBatchTransaction) (string, error) {
	createdAt, err := parseTimeField(tx.Data, "created_at")
	if err != nil {
		return "", err
	}

	switch tx.Type {
	case domain.SyncTransactionTypeSale:
		amount, err := parseAmountField(tx.Data, "amount")
		if err != nil {
			return "", err
		}
		quantity, err := parseIntField(tx.Data, "quantity")
		if err != nil {
			return "", err
		}
		if quantity <= 0 {
			return "", errors.New("sale quantity must be > 0")
		}

		var productID *primitive.ObjectID
		if productIDRaw, ok := tx.Data["product_id"]; ok {
			productIDStr, ok := productIDRaw.(string)
			if ok && strings.TrimSpace(productIDStr) != "" {
				parsedProductID, parseErr := primitive.ObjectIDFromHex(productIDStr)
				if parseErr != nil {
					return "", errors.New("invalid product_id")
				}
				productID = &parsedProductID
			}
		}

		unitPrice := amount.Div(decimal.NewFromInt(int64(quantity)))
		saleID := primitive.NewObjectID()
		doc := bson.M{
			"_id":        saleID,
			"business_id": businessID,
			"product_id": productID,
			"unit_price": unitPrice,
			"quantity":   quantity,
			"total":      amount,
			"created_at": createdAt,
			"is_voided":  false,
			"local_id":   tx.LocalID,
			"device_id":  deviceID,
			"synced_at":  time.Now().UTC(),
		}
		if _, err := r.sales.InsertOne(ctx, doc); err != nil {
			return "", err
		}
		return saleID.Hex(), nil

	case domain.SyncTransactionTypeExpense:
		amount, err := parseAmountField(tx.Data, "amount")
		if err != nil {
			return "", err
		}
		categoryRaw, ok := tx.Data["category"].(string)
		if !ok || strings.TrimSpace(categoryRaw) == "" {
			return "", errors.New("expense category is required")
		}
		category := strings.ToUpper(strings.TrimSpace(categoryRaw))
		if !domain.IsValidExpenseCategory(category) {
			return "", errors.New("invalid expense category")
		}

		note := ""
		if description, ok := tx.Data["description"].(string); ok {
			note = description
		} else if altNote, ok := tx.Data["note"].(string); ok {
			note = altNote
		}

		expenseID := primitive.NewObjectID()
		doc := bson.M{
			"_id":         expenseID,
			"business_id": businessID,
			"category":    category,
			"amount":      amount,
			"note":        note,
			"created_at":  createdAt,
			"is_voided":   false,
			"local_id":    tx.LocalID,
			"device_id":   deviceID,
			"synced_at":   time.Now().UTC(),
		}
		if _, err := r.expenses.InsertOne(ctx, doc); err != nil {
			return "", err
		}
		return expenseID.Hex(), nil
	}

	return "", errors.New("unsupported transaction type")
}

func parseAmountField(data map[string]interface{}, key string) (decimal.Decimal, error) {
	raw, exists := data[key]
	if !exists {
		return decimal.Zero, errors.New(key + " is required")
	}
	switch v := raw.(type) {
	case float64:
		if v < 0 {
			return decimal.Zero, errors.New(key + " cannot be negative")
		}
		return decimal.NewFromFloat(v), nil
	case int:
		if v < 0 {
			return decimal.Zero, errors.New(key + " cannot be negative")
		}
		return decimal.NewFromInt(int64(v)), nil
	case int32:
		if v < 0 {
			return decimal.Zero, errors.New(key + " cannot be negative")
		}
		return decimal.NewFromInt(int64(v)), nil
	case int64:
		if v < 0 {
			return decimal.Zero, errors.New(key + " cannot be negative")
		}
		return decimal.NewFromInt(v), nil
	case string:
		d, err := decimal.NewFromString(v)
		if err != nil {
			return decimal.Zero, errors.New("invalid " + key)
		}
		if d.LessThan(decimal.Zero) {
			return decimal.Zero, errors.New(key + " cannot be negative")
		}
		return d, nil
	default:
		return decimal.Zero, errors.New("invalid " + key)
	}
}

func parseIntField(data map[string]interface{}, key string) (int, error) {
	raw, exists := data[key]
	if !exists {
		return 0, errors.New(key + " is required")
	}
	switch v := raw.(type) {
	case float64:
		if v != math.Trunc(v) {
			return 0, errors.New(key + " must be a whole number")
		}
		return int(v), nil
	case int:
		return v, nil
	case int32:
		return int(v), nil
	case int64:
		return int(v), nil
	default:
		return 0, errors.New("invalid " + key)
	}
}

func parseTimeField(data map[string]interface{}, key string) (time.Time, error) {
	raw, exists := data[key]
	if !exists {
		return time.Time{}, errors.New(key + " is required")
	}
	str, ok := raw.(string)
	if !ok || strings.TrimSpace(str) == "" {
		return time.Time{}, errors.New("invalid " + key)
	}
	parsed, err := time.Parse(time.RFC3339, str)
	if err != nil {
		return time.Time{}, errors.New("invalid " + key + " format")
	}
	return parsed.UTC(), nil
}
