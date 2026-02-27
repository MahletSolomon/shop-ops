package domain

import (
	"errors"
	"time"

	"github.com/shopspring/decimal"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ExpenseCategory represents the type of expense
type ExpenseCategory string

const (
	ExpenseRent          ExpenseCategory = "RENT"
	ExpenseUtilities     ExpenseCategory = "UTILITIES"
	ExpenseSalary        ExpenseCategory = "SALARY"
	ExpenseStockPurchase ExpenseCategory = "STOCK_PURCHASE"
	ExpenseTransport     ExpenseCategory = "TRANSPORT"
	ExpenseMarketing     ExpenseCategory = "MARKETING"
	ExpenseMaintenance   ExpenseCategory = "MAINTENANCE"
	ExpenseOther         ExpenseCategory = "OTHER"
)

// Domain errors  expense module
var (
	ErrExpenseNotFound		= errors.New("expense not found")
	ErrUnauthorized 		= errors.New("unauthorized access to expense")
	ErrInvalidCategory 		= errors.New("invalid expense category")
	ErrMissingBusinessID	= errors.New("business ID is required")
	ErrNegativeAmount 		= errors.New("amount cannot be negative")
	ErrCannotUpdateSynced 	= errors.New("cannot update synced expense")
	ErrCannotUpdateVoided 	= errors.New("cannot update voided expense")
)

// GetAllExpenseCategories  expense categories
func GetAllExpenseCategories() []ExpenseCategory {
	return []ExpenseCategory{
		ExpenseRent,
		ExpenseUtilities,
		ExpenseSalary,
		ExpenseStockPurchase,
		ExpenseTransport,
		ExpenseTransport,
		ExpenseMarketing,
		ExpenseMaintenance,
		ExpenseOther,
	}
}

func IsValidExpenseCategory(category string) bool {
	for _, c := range GetAllExpenseCategories() {
		if string(c) == category {
			return true
		}
	}
	return false
}

// Expense represents  expense
type Expense struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	BusinessID primitive.ObjectID `bson:"business_id" json:"business_id"`
	Category   ExpenseCategory    `bson:"category" json:"category"`
	Amount     decimal.Decimal    `bson:"amount" json:"amount"`
	Note       string             `bson:"note" json:"note"`
	CreatedAt  time.Time          `bson:"created_at" json:"created_at"`
	IsVoided   bool               `bson:"is_voided" json:"is_voided"`
}

// NewExpense creates a new Expense instance
func NewExpense(businessID primitive.ObjectID, category ExpenseCategory, amount decimal.Decimal, note string) *Expense {
	now := time.Now()
	return &Expense{
		ID:         primitive.NewObjectID(),
		BusinessID: businessID,
		Category:   category,
		Amount:     amount,
		Note:       note,
		CreatedAt:  now,
		IsVoided:   false,
	}
}

// Validate checks if the expense data is valid
func (e *Expense) Validate() error {
	if e.BusinessID.IsZero() {
		return errors.New("business ID is required")
	}
	if e.Amount.LessThan(decimal.Zero) {
		return errors.New("amount cannot be negative")
	}
	if e.Category == "" {
		return errors.New("expense category is required")
	}
	return nil
}


// Void marks the expense as voided
func (e *Expense) Void() {
	e.IsVoided = true
}