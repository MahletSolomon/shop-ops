package domain

import "time"

// ExportStatus represents the current state of an export request
type ExportStatus string

const (
	ExportStatusPending   ExportStatus = "pending"
	ExportStatusCompleted ExportStatus = "completed"
	ExportStatusFailed    ExportStatus = "failed"
)

// ExportRequest represents a request to export data
type ExportRequest struct {
	ID         string       `json:"id" bson:"_id"`
	BusinessID string       `json:"business_id" bson:"business_id"`
	UserID     string       `json:"user_id" bson:"user_id"`
	Type       string       `json:"type" bson:"type"`     // "sales", "expenses", "transactions", "inventory", "profit"
	Format     string       `json:"format" bson:"format"` // "csv"
	Filters    ExportFilter `json:"filters,omitempty" bson:"filters,omitempty"`
	Fields     []string     `json:"fields,omitempty" bson:"fields,omitempty"`
	Status     ExportStatus `json:"status" bson:"status"`
	FileURL    string       `json:"file_url,omitempty" bson:"file_url,omitempty"` // URL or local path to the generated file
	Error      string       `json:"error,omitempty" bson:"error,omitempty"`
	CreatedAt  time.Time    `json:"created_at" bson:"created_at"`
	UpdatedAt  time.Time    `json:"updated_at" bson:"updated_at"`
}

// ExportFilter represents optional filters applied to the export
type ExportFilter struct {
	StartDate    string   `json:"start_date,omitempty" bson:"start_date,omitempty"`
	EndDate      string   `json:"end_date,omitempty" bson:"end_date,omitempty"`
	Category     string   `json:"category,omitempty" bson:"category,omitempty"`
	ProductID    string   `json:"product_id,omitempty" bson:"product_id,omitempty"`
	Search       string   `json:"search,omitempty" bson:"search,omitempty"`
	LowStockOnly bool     `json:"low_stock_only,omitempty" bson:"low_stock_only,omitempty"`
	MinAmount    *float64 `json:"min_amount,omitempty" bson:"min_amount,omitempty"`
	MaxAmount    *float64 `json:"max_amount,omitempty" bson:"max_amount,omitempty"`
}

// ExportRepository defines the interface for data access
type ExportRepository interface {
	Create(request *ExportRequest) error
	GetByID(id string, businessID string) (*ExportRequest, error)
	GetByBusiness(businessID string, limit, offset int) ([]ExportRequest, error)
	UpdateStatus(id string, status ExportStatus, fileURL, errorMessage string) error
	CountByBusiness(businessID string) (int64, error)
}

// ExportUsecases defines the interface for export business logic
type ExportUsecases interface {
	RequestExport(businessID, userID, exportType, format string, filters map[string]interface{}, fields []string) (*ExportRequest, error)
	GetExportStatus(id, businessID string) (*ExportRequest, error)
	GetExportHistory(businessID string, page, limit int) ([]ExportRequest, int64, error)
}
