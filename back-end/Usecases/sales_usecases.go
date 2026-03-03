package usecases

import (
	"fmt"
	"time"

	Domain "shop-ops/Domain"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SalesUseCase defines business logic operations for sales
type SalesUseCase interface {
	CreateSale(businessID, userID string, req Domain.CreateSaleRequest) (*Domain.SaleResponse, error)
	GetSales(businessID string, query Domain.SaleListQuery) (*Domain.SaleListResponse, error)
	GetSaleByID(id, businessID string) (*Domain.SaleResponse, error)
	UpdateSale(id, businessID string, req Domain.UpdateSaleRequest) (*Domain.SaleResponse, error)
	VoidSale(id, businessID, userID string) error
	GetSalesSummary(businessID string, startDate, endDate string) (*Domain.SaleSummaryResponse, error)
	GetSalesStats(businessID string) (*Domain.SaleStatsResponse, error)
}

type salesUseCase struct {
	salesRepo     Domain.SaleRepository
	inventoryRepo Domain.ProductRepository
	businessRepo  Domain.BusinessRepository
}

// NewSalesUseCase constructs a SalesUseCase with all required dependencies
func NewSalesUseCase(
	salesRepo Domain.SaleRepository,
	inventoryRepo Domain.ProductRepository,
	businessRepo Domain.BusinessRepository,
) SalesUseCase {
	return &salesUseCase{
		salesRepo:     salesRepo,
		inventoryRepo: inventoryRepo,
		businessRepo:  businessRepo,
	}
}

// CreateSale records a new sale and optionally decrements product stock
func (uc *salesUseCase) CreateSale(businessID, userID string, req Domain.CreateSaleRequest) (*Domain.SaleResponse, error) {
	// Validate business exists
	business, err := uc.businessRepo.FindByID(businessID)
	if err != nil {
		return nil, fmt.Errorf("failed to find business: %w", err)
	}
	if business == nil {
		return nil, fmt.Errorf("business not found")
	}

	objBusinessID, err := primitive.ObjectIDFromHex(businessID)
	if err != nil {
		return nil, fmt.Errorf("invalid business ID: %w", err)
	}

	// Resolve optional product ID
	var objProductID *primitive.ObjectID
	if req.ProductID != nil && *req.ProductID != "" {
		id, err := primitive.ObjectIDFromHex(*req.ProductID)
		if err != nil {
			return nil, fmt.Errorf("invalid product ID: %w", err)
		}
		// Verify product belongs to business
		product, err := uc.inventoryRepo.FindByID(*req.ProductID)
		if err != nil {
			return nil, fmt.Errorf("failed to find product: %w", err)
		}
		if product == nil {
			return nil, fmt.Errorf("product not found")
		}
		if product.BusinessID.Hex() != businessID {
			return nil, fmt.Errorf("product does not belong to this business")
		}
		objProductID = &id
	}

	// Build sale domain object
	sale := Domain.NewSale(
		objBusinessID,
		objProductID,
		req.UnitPrice,
		req.Quantity,
		req.Note,
	)

	if err := sale.Validate(); err != nil {
		return nil, fmt.Errorf("invalid sale: %w", err)
	}

	// Persist the sale
	if err := uc.salesRepo.Create(sale); err != nil {
		return nil, fmt.Errorf("failed to create sale: %w", err)
	}

	// Adjust inventory (stock decrease) if a product was specified
	if objProductID != nil {
		referenceID := sale.ID.Hex()
		if err := uc.inventoryRepo.AdjustStock(
			objProductID.Hex(),
			req.Quantity,
			Domain.MovementTypeSale,
			"Sale transaction",
			&referenceID,
			userID,
		); err != nil {
			return nil, fmt.Errorf("sale recorded but stock adjustment failed: %w", err)
		}
	}

	return uc.toSaleResponse(sale), nil
}

// GetSales returns a paginated list of sales for a business
func (uc *salesUseCase) GetSales(businessID string, query Domain.SaleListQuery) (*Domain.SaleListResponse, error) {
	if query.Page < 1 {
		query.Page = 1
	}
	if query.Limit < 1 {
		query.Limit = 50
	}

	// Default to last 30 days if no dates provided
	if query.StartDate == "" && query.EndDate == "" {
		query.EndDate = time.Now().Format("2006-01-02")
		query.StartDate = time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	}

	sales, total, err := uc.salesRepo.FindByBusinessID(businessID, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get sales: %w", err)
	}

	saleResponses := make([]Domain.SaleResponse, len(sales))
	for i, sale := range sales {
		saleResponses[i] = *uc.toSaleResponse(&sale)
	}

	totalPages := (int(total) + query.Limit - 1) / query.Limit

	return &Domain.SaleListResponse{
		Sales: saleResponses,
		Pagination: Domain.PaginationMetadata{
			Page:       query.Page,
			Limit:      query.Limit,
			Total:      int(total),
			TotalPages: totalPages,
		},
	}, nil
}

// GetSaleByID fetches a single sale and verifies business ownership
func (uc *salesUseCase) GetSaleByID(id, businessID string) (*Domain.SaleResponse, error) {
	sale, err := uc.salesRepo.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to find sale: %w", err)
	}
	if sale == nil {
		return nil, fmt.Errorf("sale not found")
	}
	if sale.BusinessID.Hex() != businessID {
		return nil, fmt.Errorf("access denied: sale does not belong to this business")
	}
	return uc.toSaleResponse(sale), nil
}

// VoidSale marks a sale as voided and reverses the inventory stock if applicable
func (uc *salesUseCase) VoidSale(id, businessID, userID string) error {
	sale, err := uc.salesRepo.FindByID(id)
	if err != nil {
		return fmt.Errorf("failed to find sale: %w", err)
	}
	if sale == nil {
		return fmt.Errorf("sale not found")
	}
	if sale.BusinessID.Hex() != businessID {
		return fmt.Errorf("access denied: sale does not belong to this business")
	}
	if sale.IsVoided {
		return fmt.Errorf("sale is already voided")
	}

	// Void in repository
	if err := uc.salesRepo.VoidSale(id); err != nil {
		return fmt.Errorf("failed to void sale: %w", err)
	}

	// Reverse inventory: return stock if product was specified
	if sale.ProductID != nil {
		referenceID := sale.ID.Hex()
		if err := uc.inventoryRepo.AdjustStock(
			sale.ProductID.Hex(),
			sale.Quantity,
			Domain.MovementTypeReturn,
			"Sale voided – stock returned",
			&referenceID,
			userID,
		); err != nil {
			fmt.Printf("WARNING: failed to reverse inventory for voided sale %s: %v\n", id, err)
		}
	}

	return nil
}

// UpdateSale updates the note of a sale (only allowed before sync)
func (uc *salesUseCase) UpdateSale(id, businessID string, req Domain.UpdateSaleRequest) (*Domain.SaleResponse, error) {
	sale, err := uc.salesRepo.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to find sale: %w", err)
	}
	if sale == nil {
		return nil, fmt.Errorf("sale not found")
	}
	if sale.BusinessID.Hex() != businessID {
		return nil, fmt.Errorf("access denied: sale does not belong to this business")
	}
	if sale.IsVoided {
		return nil, fmt.Errorf("cannot update a voided sale")
	}

	note := sale.Note
	if req.Note != nil {
		note = *req.Note
	}

	if err := uc.salesRepo.UpdateNote(id, note); err != nil {
		return nil, fmt.Errorf("failed to update sale: %w", err)
	}

	sale.Note = note
	return uc.toSaleResponse(sale), nil
}

// GetSalesStats returns daily, weekly, and monthly sale statistics
func (uc *salesUseCase) GetSalesStats(businessID string) (*Domain.SaleStatsResponse, error) {
	now := time.Now()

	// Daily: today
	dayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	dayEnd := dayStart.Add(24*time.Hour - time.Second)

	// Weekly: last 7 days
	weekStart := now.AddDate(0, 0, -7)
	weekEnd := now

	// Monthly: current calendar month
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	monthEnd := now

	daily, err := uc.salesRepo.GetSummary(businessID, dayStart, dayEnd)
	if err != nil {
		return nil, fmt.Errorf("failed to get daily stats: %w", err)
	}
	daily.Period = dayStart.Format("2006-01-02")

	weekly, err := uc.salesRepo.GetSummary(businessID, weekStart, weekEnd)
	if err != nil {
		return nil, fmt.Errorf("failed to get weekly stats: %w", err)
	}
	weekly.Period = fmt.Sprintf("%s to %s", weekStart.Format("2006-01-02"), weekEnd.Format("2006-01-02"))

	monthly, err := uc.salesRepo.GetSummary(businessID, monthStart, monthEnd)
	if err != nil {
		return nil, fmt.Errorf("failed to get monthly stats: %w", err)
	}
	monthly.Period = monthStart.Format("2006-01")

	return &Domain.SaleStatsResponse{
		Daily:   *daily,
		Weekly:  *weekly,
		Monthly: *monthly,
	}, nil
}

// GetSalesSummary aggregates revenue and count for a given period
func (uc *salesUseCase) GetSalesSummary(businessID string, startDateStr, endDateStr string) (*Domain.SaleSummaryResponse, error) {
	var startDate, endDate time.Time
	var err error

	if startDateStr != "" {
		startDate, err = time.Parse("2006-01-02", startDateStr)
		if err != nil {
			return nil, fmt.Errorf("invalid start_date format (use YYYY-MM-DD): %w", err)
		}
	} else {
		startDate = time.Now().AddDate(0, 0, -30)
	}

	if endDateStr != "" {
		endDate, err = time.Parse("2006-01-02", endDateStr)
		if err != nil {
			return nil, fmt.Errorf("invalid end_date format (use YYYY-MM-DD): %w", err)
		}
		// include the full end day
		endDate = endDate.Add(24*time.Hour - time.Second)
	} else {
		endDate = time.Now()
	}

	summary, err := uc.salesRepo.GetSummary(businessID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get sales summary: %w", err)
	}

	summary.Period = fmt.Sprintf("%s to %s", startDate.Format("2006-01-02"), endDate.Format("2006-01-02"))
	return summary, nil
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

func (uc *salesUseCase) toSaleResponse(sale *Domain.Sale) *Domain.SaleResponse {
	resp := &Domain.SaleResponse{
		ID:         sale.ID.Hex(),
		BusinessID: sale.BusinessID.Hex(),
		UnitPrice:  sale.UnitPrice,
		Quantity:   sale.Quantity,
		Total:      sale.Total,
		Note:       sale.Note,
		IsVoided:   sale.IsVoided,
		CreatedAt:  sale.CreatedAt,
	}
	if sale.ProductID != nil {
		s := sale.ProductID.Hex()
		resp.ProductID = &s
	}
	return resp
}
