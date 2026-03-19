package usecases

import (
	"context"
	domain "shop-ops/Domain"
	repositories "shop-ops/Repositories"
	"time"

	"github.com/shopspring/decimal"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// TransactionFilterRequest represents the filter parameters for transaction queries
type TransactionFilterRequest struct {
	BusinessID primitive.ObjectID
	StartDate  *time.Time
	EndDate    *time.Time
	Type       *string
	Category   *string
	ProductID  *string
	MinAmount  *float64
	MaxAmount  *float64
	Search     string
	Page       int
	Limit      int
	Sort       string
	Order      string
}

// TransactionUseCases contains business logic for transaction operations
type TransactionUseCases struct {
	transactionRepo repositories.TransactionRepository
}

// NewTransactionUseCases creates a new TransactionUseCases instance
func NewTransactionUseCases(transactionRepo repositories.TransactionRepository) *TransactionUseCases {
	return &TransactionUseCases{
		transactionRepo: transactionRepo,
	}
}

// GetTransactions retrieves a unified list of transactions with filters and pagination
func (uc *TransactionUseCases) GetTransactions(req TransactionFilterRequest) (*domain.TransactionList, error) {
	ctx := context.Background()

	// Build domain filter from request
	filter := domain.NewTransactionFilter(req.BusinessID)

	// Override defaults with provided values
	if req.StartDate != nil {
		filter.StartDate = req.StartDate
	}
	if req.EndDate != nil {
		filter.EndDate = req.EndDate
	}

	// Parse transaction type
	if req.Type != nil && *req.Type != "" && *req.Type != "all" {
		txnType := domain.TransactionType(*req.Type)
		if txnType == domain.TransactionTypeSale || txnType == domain.TransactionTypeExpense {
			filter.Type = &txnType
		}
	}

	// Category filter (only applies to expenses)
	if req.Category != nil && *req.Category != "" {
		filter.Category = req.Category
	}

	// Product filter (only applies to sales)
	if req.ProductID != nil && *req.ProductID != "" {
		productObjID, err := primitive.ObjectIDFromHex(*req.ProductID)
		if err == nil {
			filter.ProductID = &productObjID
		}
	}

	// Amount range
	if req.MinAmount != nil {
		minDecimal := decimal.NewFromFloat(*req.MinAmount)
		filter.MinAmount = &minDecimal
	}
	if req.MaxAmount != nil {
		maxDecimal := decimal.NewFromFloat(*req.MaxAmount)
		filter.MaxAmount = &maxDecimal
	}

	// Search
	filter.Search = req.Search

	// Pagination
	if req.Page > 0 {
		filter.Page = req.Page
	}
	if req.Limit > 0 {
		filter.Limit = req.Limit
	}

	// Sorting
	if req.Sort != "" {
		filter.Sort = req.Sort
	}
	if req.Order != "" {
		filter.Order = req.Order
	}

	return uc.transactionRepo.GetTransactions(ctx, *filter)
}
