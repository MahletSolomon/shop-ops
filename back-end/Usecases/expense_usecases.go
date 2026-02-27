package usecases

import (
	"context"
	domain "shop-ops/Domain"
	repositories "shop-ops/Repositories"
	"time"

	"github.com/shopspring/decimal"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

//RecordExpenseRequest

type RecordExpenseRequest struct {
	BusinessID primitive.ObjectID     `json:"businessId"`
	Category   domain.ExpenseCategory `json:"category"`
	Amount     decimal.Decimal        `json:"amount"`
	Note       string                 `json:"note"`
}

// UpdateExpenseRequest
type UpdateExpenseRequest struct {
	Category *domain.ExpenseCategory `json:"category"`
	Amount   *decimal.Decimal        `json:"amount"`
	Note     *string                 `json:"note"`
}

// ExpenseList
type ExpensesList struct {
	Expenses []*domain.Expense `json:"expenses"`
	Total    int64             `json:"total"`
	Page     int               `json:"page"`
	Limit    int               `json:"limit"`
}

// CategorySummary
type CategorySummary struct {
	Categories map[string]decimal.Decimal `json:"categories"`
	Total      decimal.Decimal            `json:"total"`
}

// DateRange
type DateRange struct {
	StartDate *time.Time
	EndDate   *time.Time
}

// Pagination
type Pagination struct {
	Page  int
	Limit int
	Sort  string
	Order string
}

// ExpenseFilter
type ExpenseFilter struct {
	Category      *domain.ExpenseCategory
	MinAmount     *decimal.Decimal
	MaxAmount     *decimal.Decimal
	DateRange     *DateRange
	IncludeVoided bool
}

// ExpenseUseCases conatins the business logic for expenses
type ExpenseUseCases struct {
	expenseRepo repositories.ExpenseRepository
}

// NewExpenseUseCases creates a new ExpenseUseCases instance
func NewExpenseUseCases(expenseRepo repositories.ExpenseRepository) *ExpenseUseCases {
	return &ExpenseUseCases{
		expenseRepo: expenseRepo,
	}
}

// RecordExpense records a new expense
func (uc *ExpenseUseCases) RecordExpense(req RecordExpenseRequest) (*domain.Expense, error) {
	//validate category
	if !domain.IsValidExpenseCategory(string(req.Category)) {
		return nil, domain.ErrInvalidCategory
	}

	//Create expense
	expense := domain.NewExpense(
		req.BusinessID,
		req.Category,
		req.Amount,
		req.Note,
	)

	//validate
	if err := expense.Validate(); err != nil {
		return nil, err
	}

	// Save
	ctx := context.Background()
	if err := uc.expenseRepo.Create(ctx, expense); err != nil {
		return nil, err
	}
	return expense, nil
}

// GetExpenses retrieves a list of expenses with filters and pagination
func (uc *ExpenseUseCases) GetExpenses(businessId primitive.ObjectID, filter ExpenseFilter, pagination Pagination) (*ExpensesList, error) {
	ctx := context.Background()

	// Default pagination values
	if pagination.Limit <= 0 {
		pagination.Limit = 50
	}
	if pagination.Page <= 0 {
		pagination.Page = 1
	}
	if pagination.Sort == "" {
		pagination.Sort = "date"
	}
	if pagination.Order == "" {
		pagination.Order = "desc"
	}

	// Default date range: last 30 days if not specified
	if filter.DateRange == nil || (filter.DateRange.StartDate == nil && filter.DateRange.EndDate == nil) {
		thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
		filter.DateRange = &DateRange{
			StartDate: &thirtyDaysAgo,
			EndDate:   nil,
		}
	}

	// Convert to repository filter
	repoFilter := repositories.ExpenseFilter{
		BusinessID:    businessId,
		StartDate:     nil,
		EndDate:       nil,
		Category:      filter.Category,
		MinAmount:     filter.MinAmount,
		MaxAmount:     filter.MaxAmount,
		IncludeVoided: filter.IncludeVoided,
		Page:          pagination.Page,
		Limit:         pagination.Limit,
		Sort:          pagination.Sort,
		Order:         pagination.Order,
	}

	if filter.DateRange != nil {
		repoFilter.StartDate = filter.DateRange.StartDate
		repoFilter.EndDate = filter.DateRange.EndDate
	}

	expenses, total, err := uc.expenseRepo.GetByBusinessID(ctx, repoFilter)
	if err != nil {
		return nil, err
	}

	return &ExpensesList{
		Expenses: expenses,
		Total:    total,
		Page:     pagination.Page,
		Limit:    pagination.Limit,
	}, nil
}

// GetExpenseById retrieves an expense by its ID
func (uc *ExpenseUseCases) GetExpenseById(expenseId primitive.ObjectID) (*domain.Expense, error) {
	ctx := context.Background()
	return uc.expenseRepo.GetByID(ctx, expenseId)
}

// UpdateExpense updates an existing expense that hasn't been voided or synced
func (uc *ExpenseUseCases) UpdateExpense(expenseId primitive.ObjectID, req UpdateExpenseRequest) (*domain.Expense, error) {
	ctx := context.Background()

	expense, err := uc.expenseRepo.GetByID(ctx, expenseId)
	if err != nil {
		return nil, err
	}

	if expense.IsVoided {
		return nil, domain.ErrCannotUpdateVoided
	}

	// Update individual fields if provided
	if req.Category != nil {
		if !domain.IsValidExpenseCategory(string(*req.Category)) {
			return nil, domain.ErrInvalidCategory
		}
		expense.Category = *req.Category
	}

	if req.Amount != nil {
		if req.Amount.LessThan(decimal.Zero) {
			return nil, domain.ErrNegativeAmount
		}
		expense.Amount = *req.Amount
	}

	if req.Note != nil {
		expense.Note = *req.Note
	}

	if err := uc.expenseRepo.Update(ctx, expense); err != nil {
		return nil, err
	}

	return expense, nil
}

// VoidExpense voids an expense (soft delete)
func (uc *ExpenseUseCases) VoidExpense(expenseId primitive.ObjectID) error {
	ctx := context.Background()

	expense, err := uc.expenseRepo.GetByID(ctx, expenseId)
	if err != nil {
		return err
	}

	if expense.IsVoided {
		return nil
	}

	return uc.expenseRepo.Void(ctx, expenseId)
}

// GetExpensesByCategory retrieves expense summary by category
func (uc *ExpenseUseCases) GetExpensesByCategory(businessId primitive.ObjectID, dateRange DateRange) (*CategorySummary, error) {
	ctx := context.Background()

	summary, total, err := uc.expenseRepo.GetSummaryByCategory(
		ctx,
		businessId,
		dateRange.StartDate,
		dateRange.EndDate,
	)
	if err != nil {
		return nil, err
	}

	categories := make(map[string]decimal.Decimal)
	for cat, amount := range summary {
		categories[string(cat)] = amount
	}

	return &CategorySummary{
		Categories: categories,
		Total:      total,
	}, nil
}
