package domain

import (
	"errors"
	"math"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Sale represents a sales transaction
type Sale struct {
	ID         primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	BusinessID primitive.ObjectID  `bson:"business_id" json:"business_id"`
	ProductID  *primitive.ObjectID `bson:"product_id,omitempty" json:"product_id,omitempty"` // Pointer for optional
	UnitPrice  float64             `bson:"unit_price" json:"unit_price"`
	Quantity   int                 `bson:"quantity" json:"quantity"`
	Total      float64             `bson:"total" json:"total"`
	Note       string              `bson:"note,omitempty" json:"note,omitempty"`
	CreatedAt  time.Time           `bson:"created_at" json:"created_at"`
	IsVoided   bool                `bson:"is_voided" json:"is_voided"`
}

// NewSale creates a new Sale instance and calculates the total
func NewSale(businessID primitive.ObjectID, productID *primitive.ObjectID, unitPrice float64, quantity int, note string) *Sale {
	sale := &Sale{
		ID:         primitive.NewObjectID(),
		BusinessID: businessID,
		ProductID:  productID,
		UnitPrice:  unitPrice,
		Quantity:   quantity,
		Note:       note,
		CreatedAt:  time.Now(),
		IsVoided:   false,
	}
	sale.CalculateTotal()
	return sale
}

// CalculateTotal computes the total amount based on unit price and quantity
func (s *Sale) CalculateTotal() float64 {
	s.Total = math.Round(s.UnitPrice*float64(s.Quantity)*100) / 100
	return s.Total
}

// Validate checks if the sale data is valid
func (s *Sale) Validate() error {
	if s.BusinessID.IsZero() {
		return errors.New("business ID is required")
	}
	if s.UnitPrice < 0 {
		return errors.New("unit price cannot be negative")
	}
	if s.Quantity <= 0 {
		return errors.New("quantity must be positive")
	}
	expected := math.Round(s.UnitPrice*float64(s.Quantity)*100) / 100
	if s.Total != expected {
		return errors.New("total amount mismatch")
	}
	return nil
}

// ──────────────────────────────────────────────
// Request / Response DTOs
// ──────────────────────────────────────────────

// CreateSaleRequest is the payload for recording a new sale
type CreateSaleRequest struct {
	ProductID *string `json:"product_id,omitempty"`
	UnitPrice float64 `json:"unit_price" validate:"required,gt=0"`
	Quantity  int     `json:"quantity"   validate:"required,gt=0"`
	Note      string  `json:"note,omitempty"`
}

// UpdateSaleRequest is the payload for updating a sale (note only, before sync)
type UpdateSaleRequest struct {
	Note *string `json:"note,omitempty"`
}

// SaleListQuery holds query parameters for listing sales
type SaleListQuery struct {
	StartDate  string  `form:"start_date"`
	EndDate    string  `form:"end_date"`
	ProductID  string  `form:"product_id"`
	MinAmount  float64 `form:"min_amount"`
	MaxAmount  float64 `form:"max_amount"`
	Page       int     `form:"page,default=1"`
	Limit      int     `form:"limit,default=50"`
	Sort       string  `form:"sort,default=created_at"`
	Order      string  `form:"order,default=desc"`
}

// SaleResponse is the API representation of a sale
type SaleResponse struct {
	ID         string  `json:"id"`
	BusinessID string  `json:"business_id"`
	ProductID  *string `json:"product_id,omitempty"`
	UnitPrice  float64 `json:"unit_price"`
	Quantity   int     `json:"quantity"`
	Total      float64 `json:"total"`
	Note       string  `json:"note,omitempty"`
	IsVoided   bool    `json:"is_voided"`
	CreatedAt  time.Time `json:"created_at"`
}

// SaleListResponse is the paginated list of sales
type SaleListResponse struct {
	Sales      []SaleResponse     `json:"sales"`
	Pagination PaginationMetadata `json:"pagination"`
}

// SaleSummaryResponse aggregates sales totals for a time period
type SaleSummaryResponse struct {
	TotalSales   int     `json:"total_sales"`
	TotalRevenue float64 `json:"total_revenue"`
	VoidedCount  int     `json:"voided_count"`
	Period       string  `json:"period,omitempty"`
}

// SaleStatsResponse provides detailed statistics including daily/weekly/monthly breakdowns
type SaleStatsResponse struct {
	Daily   SaleSummaryResponse `json:"daily"`
	Weekly  SaleSummaryResponse `json:"weekly"`
	Monthly SaleSummaryResponse `json:"monthly"`
}

// ──────────────────────────────────────────────
// Repository interface
// ──────────────────────────────────────────────

// SaleRepository defines data access operations for sales
type SaleRepository interface {
	Create(sale *Sale) error
	FindByID(id string) (*Sale, error)
	FindByBusinessID(businessID string, query SaleListQuery) ([]Sale, int64, error)
	UpdateNote(id string, note string) error
	VoidSale(id string) error
	GetSummary(businessID string, startDate, endDate time.Time) (*SaleSummaryResponse, error)
}
