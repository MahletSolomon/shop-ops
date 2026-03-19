package domain

import "time"

// SyncTransactionType identifies a transaction payload type in sync batches.
type SyncTransactionType string

const (
	SyncTransactionTypeSale    SyncTransactionType = "sale"
	SyncTransactionTypeExpense SyncTransactionType = "expense"
)

// SyncBatchTransaction represents a single client-side transaction payload.
type SyncBatchTransaction struct {
	LocalID string                 `json:"local_id"`
	Type    SyncTransactionType    `json:"type"`
	Data    map[string]interface{} `json:"data"`
}

// SyncBatchRequest defines the offline batch sync request payload.
type SyncBatchRequest struct {
	BusinessID    string                 `json:"business_id"`
	DeviceID      string                 `json:"device_id"`
	SyncTimestamp time.Time              `json:"sync_timestamp"`
	Transactions  []SyncBatchTransaction `json:"transactions"`
}

// SyncItemResult contains the processing result for a single local transaction.
type SyncItemResult struct {
	LocalID  string `json:"local_id" bson:"local_id"`
	ServerID string `json:"server_id,omitempty" bson:"server_id,omitempty"`
	Status   string `json:"status" bson:"status"`
	Message  string `json:"message,omitempty" bson:"message,omitempty"`
}

// SyncSummary represents aggregate counts for a sync batch.
type SyncSummary struct {
	Total   int `json:"total" bson:"total"`
	Success int `json:"success" bson:"success"`
	Failed  int `json:"failed" bson:"failed"`
}

// SyncBatchResponse is returned by the sync batch endpoint.
type SyncBatchResponse struct {
	SyncID     string           `json:"sync_id"`
	Status     string           `json:"status"`
	Timestamp  time.Time        `json:"timestamp"`
	Results    []SyncItemResult `json:"results"`
	Summary    SyncSummary      `json:"summary"`
	RetryAfter *int             `json:"retry_after_seconds,omitempty"`
}

// SyncLog represents one synchronization attempt.
type SyncLog struct {
	ID            string           `json:"id" bson:"_id,omitempty"`
	BusinessID    string           `json:"business_id" bson:"business_id"`
	DeviceID      string           `json:"device_id" bson:"device_id"`
	SyncTimestamp time.Time        `json:"sync_timestamp" bson:"sync_timestamp"`
	Status        string           `json:"status" bson:"status"`
	Results       []SyncItemResult `json:"results" bson:"results"`
	Summary       SyncSummary      `json:"summary" bson:"summary"`
	CreatedAt     time.Time        `json:"created_at" bson:"created_at"`
}

// SyncStatusResponse provides high-level sync state for a business/device.
type SyncStatusResponse struct {
	BusinessID    string    `json:"business_id"`
	DeviceID      string    `json:"device_id"`
	LastSyncAt    time.Time `json:"last_sync_at"`
	LastSyncID    string    `json:"last_sync_id"`
	LastStatus    string    `json:"last_status"`
	PendingRetries int64    `json:"pending_retries"`
	TotalSynced   int64     `json:"total_synced"`
	FailedLast24h int64     `json:"failed_last_24h"`
}

// SyncHistoryResponse is a paginated list of sync logs.
type SyncHistoryResponse struct {
	Data []SyncLog `json:"data"`
	Pagination struct {
		CurrentPage  int   `json:"current_page"`
		TotalPages   int   `json:"total_pages"`
		TotalRecords int64 `json:"total_records"`
		PerPage      int   `json:"per_page"`
	} `json:"pagination"`
}
