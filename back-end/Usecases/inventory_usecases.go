package usecases

import (
	"fmt"

	Domain "shop-ops/Domain"

	"github.com/shopspring/decimal"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type InventoryUseCase interface {
	CreateProduct(businessID, userID string, req Domain.CreateProductRequest) (*Domain.ProductResponse, error)
	GetProductByID(id, businessID string) (*Domain.ProductResponse, error)
	GetProducts(businessID string, query Domain.ProductListQuery) (*Domain.ProductListResponse, error)
	UpdateProduct(id, businessID, userID string, req Domain.UpdateProductRequest) (*Domain.ProductResponse, error)
	DeleteProduct(id, businessID, userID string) error
	AdjustStock(id, businessID, userID string, req Domain.AdjustStockRequest) error
	GetLowStock(businessID string) ([]Domain.ProductResponse, error)
	GetStockHistory(productID, businessID string, limit int) ([]Domain.StockMovementResponse, error)
}

type inventoryUseCase struct {
	inventoryRepo Domain.ProductRepository
	businessRepo  Domain.BusinessRepository
}

func NewInventoryUseCase(
	inventoryRepo Domain.ProductRepository,
	businessRepo Domain.BusinessRepository,
) InventoryUseCase {
	return &inventoryUseCase{
		inventoryRepo: inventoryRepo,
		businessRepo:  businessRepo,
	}
}

func (uc *inventoryUseCase) CreateProduct(businessID, userID string, req Domain.CreateProductRequest) (*Domain.ProductResponse, error) {
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

	_, err = primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	product := &Domain.Product{
		BusinessID:          objBusinessID,
		Name:                req.Name,
		DefaultSellingPrice: decimal.NewFromFloat(req.DefaultSellingPrice),
		StockQuantity:       req.StockQuantity,
		LowStockThreshold:   req.LowStockThreshold,
	}

	if err := uc.inventoryRepo.Create(product); err != nil {
		return nil, fmt.Errorf("failed to create product: %w", err)
	}

	return uc.toProductResponse(product), nil
}

func (uc *inventoryUseCase) GetProductByID(id, businessID string) (*Domain.ProductResponse, error) {
	product, err := uc.inventoryRepo.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to find product: %w", err)
	}
	if product == nil {
		return nil, fmt.Errorf("product not found")
	}

	// Verify product belongs to business
	if product.BusinessID.Hex() != businessID {
		return nil, fmt.Errorf("access denied: product does not belong to this business")
	}

	return uc.toProductResponse(product), nil
}

func (uc *inventoryUseCase) GetProducts(businessID string, query Domain.ProductListQuery) (*Domain.ProductListResponse, error) {
	// Set defaults
	if query.Page < 1 {
		query.Page = 1
	}
	if query.Limit < 1 {
		query.Limit = 50
	}

	products, total, err := uc.inventoryRepo.FindByBusinessID(businessID, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get products: %w", err)
	}

	productResponses := make([]Domain.ProductResponse, len(products))
	for i, product := range products {
		productResponses[i] = *uc.toProductResponse(&product)
	}

	totalPages := (int(total) + query.Limit - 1) / query.Limit

	response := &Domain.ProductListResponse{
		Products: productResponses,
		Pagination: Domain.PaginationMetadata{
			Page:       query.Page,
			Limit:      query.Limit,
			Total:      int(total),
			TotalPages: totalPages,
		},
	}

	return response, nil
}

func (uc *inventoryUseCase) UpdateProduct(id, businessID, userID string, req Domain.UpdateProductRequest) (*Domain.ProductResponse, error) {
	_, err := uc.GetProductByID(id, businessID)
	if err != nil {
		return nil, err
	}

	// Get full product for update
	fullProduct, err := uc.inventoryRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	// Update fields
	if req.Name != nil {
		fullProduct.Name = *req.Name
	}
	if req.DefaultSellingPrice != nil {
		fullProduct.DefaultSellingPrice = decimal.NewFromFloat(*req.DefaultSellingPrice)
	}
	if req.LowStockThreshold != nil {
		fullProduct.LowStockThreshold = *req.LowStockThreshold
	}

	if err := uc.inventoryRepo.Update(fullProduct); err != nil {
		return nil, fmt.Errorf("failed to update product: %w", err)
	}

	return uc.toProductResponse(fullProduct), nil
}

func (uc *inventoryUseCase) DeleteProduct(id, businessID, userID string) error {
	// Verify product exists and belongs to business
	_, err := uc.GetProductByID(id, businessID)
	if err != nil {
		return err
	}

	return uc.inventoryRepo.Delete(id)
}

func (uc *inventoryUseCase) AdjustStock(id, businessID, userID string, req Domain.AdjustStockRequest) error {
	// Verify product exists and belongs to business
	_, err := uc.GetProductByID(id, businessID)
	if err != nil {
		return err
	}

	// Validate movement type
	if !uc.isValidMovementType(req.Type) {
		return fmt.Errorf("invalid movement type: %s", req.Type)
	}

	// Validate reason
	if req.Reason == "" {
		return fmt.Errorf("reason is required for stock adjustment")
	}

	// Validate quantity (must be > 0 for all types)
	if req.Quantity <= 0 {
		return fmt.Errorf("quantity must be greater than 0")
	}

	// For manual adjustments, no reference ID needed
	return uc.inventoryRepo.AdjustStock(
		id,
		req.Quantity,
		req.Type,
		req.Reason,
		nil, // referenceID (optional)
		userID,
	)
}

// Helper method for other usecases to call (like sales, expenses)
func (uc *inventoryUseCase) AdjustStockWithReference(id string, quantity int, movementType Domain.MovementType, reason string, referenceID string, userID string) error {
	return uc.inventoryRepo.AdjustStock(
		id,
		quantity,
		movementType,
		reason,
		&referenceID,
		userID,
	)
}

func (uc *inventoryUseCase) GetLowStock(businessID string) ([]Domain.ProductResponse, error) {
	products, err := uc.inventoryRepo.GetLowStock(businessID)
	if err != nil {
		return nil, fmt.Errorf("failed to get low stock products: %w", err)
	}

	responses := make([]Domain.ProductResponse, len(products))
	for i, product := range products {
		responses[i] = *uc.toProductResponse(&product)
	}

	return responses, nil
}

func (uc *inventoryUseCase) GetStockHistory(productID, businessID string, limit int) ([]Domain.StockMovementResponse, error) {
	// Verify product exists and belongs to business
	product, err := uc.GetProductByID(productID, businessID)
	if err != nil {
		return nil, err
	}

	movements, err := uc.inventoryRepo.GetStockHistory(productID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get stock history: %w", err)
	}

	responses := make([]Domain.StockMovementResponse, len(movements))
	for i, movement := range movements {
		response := Domain.StockMovementResponse{
			ID:          movement.ID.Hex(),
			Type:        movement.Type,
			Quantity:    movement.Quantity,
			Reason:      movement.Reason,
			CreatedBy:   movement.CreatedBy.Hex(),
			CreatedAt:   movement.CreatedAt,
			ProductID:   productID,
			ProductName: product.Name,
		}

		if movement.ReferenceID != nil {
			refID := movement.ReferenceID.Hex()
			response.ReferenceID = &refID
		}

		responses[i] = response
	}

	return responses, nil
}

func (uc *inventoryUseCase) toProductResponse(product *Domain.Product) *Domain.ProductResponse {
	return &Domain.ProductResponse{
		ID:                  product.ID.Hex(),
		Name:                product.Name,
		DefaultSellingPrice: product.DefaultSellingPrice,
		StockQuantity:       product.StockQuantity,
		LowStockThreshold:   product.LowStockThreshold,
		IsLowStock:          product.IsLowStock(),
		CreatedAt:           product.CreatedAt,
		UpdatedAt:           product.UpdatedAt,
	}
}

func (uc *inventoryUseCase) isValidMovementType(movementType Domain.MovementType) bool {
	validTypes := []Domain.MovementType{
		Domain.MovementTypePurchase,
		Domain.MovementTypeSale,
		Domain.MovementTypeAdjust,
		Domain.MovementTypeDamage,
		Domain.MovementTypeTheft,
		Domain.MovementTypeReturn,
	}

	for _, validType := range validTypes {
		if validType == movementType {
			return true
		}
	}
	return false
}
