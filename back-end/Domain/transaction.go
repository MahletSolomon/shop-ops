package domain

import (
	"time"

	"github.com/shopspring/decimal"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// TransactionType represents the type of transaction
type TransactionType string

const (
	TransactionTypeSale    TransactionType = "sale"
	TransactionTypeExpense TransactionType = "expense"
)

// Transaction represents a unified view of sales and expenses
type Transaction struct {
	ID          string          `json:"id"`
	Type        TransactionType `json:"type"`
	Date        time.Time       `json:"date"`
	Amount      decimal.Decimal `json:"amount"`
	ProductID   *string         `json:"product_id"`
	ProductName *string         `json:"product_name"`
	Category    *string         `json:"category"`
	Description string          `json:"description"`
	CreatedAt   time.Time       `json:"created_at"`
}

// TransactionFilter contains filter options for transaction queries
type TransactionFilter struct {
	BusinessID    primitive.ObjectID
	StartDate     *time.Time
	EndDate       *time.Time
	Type          *TransactionType
	Category      *string
	ProductID     *primitive.ObjectID
	MinAmount     *decimal.Decimal
	MaxAmount     *decimal.Decimal
	Search        string
	IncludeVoided bool
	Page          int
	Limit         int
	Sort          string
	Order         string
}

// TransactionPagination contains pagination info for transaction responses
type TransactionPagination struct {
	CurrentPage  int   `json:"current_page"`
	TotalPages   int   `json:"total_pages"`
	TotalRecords int64 `json:"total_records"`
	PerPage      int   `json:"per_page"`
}

// TransactionList represents a paginated list of transactions
type TransactionList struct {
	Data       []*Transaction        `json:"data"`
	Pagination TransactionPagination `json:"pagination"`
}

// NewTransactionFilter creates a new filter with default values
func NewTransactionFilter(businessID primitive.ObjectID) *TransactionFilter {
	// Default: last 30 days
	now := time.Now()
	thirtyDaysAgo := now.AddDate(0, 0, -30)

	return &TransactionFilter{
		BusinessID:    businessID,
		StartDate:     &thirtyDaysAgo,
		EndDate:       &now,
		Type:          nil, // all types
		IncludeVoided: false,
		Page:          1,
		Limit:         50,
		Sort:          "date",
		Order:         "desc",
	}
}
