package controllers

import (
	"net/http"
	"strconv"

	Domain "shop-ops/Domain"
	Usecases "shop-ops/Usecases"

	"github.com/gin-gonic/gin"
)

type InventoryController struct {
	inventoryUC Usecases.InventoryUseCase
	businessUC  Usecases.BusinessUseCases
}

func NewInventoryController(inventoryUC Usecases.InventoryUseCase, businessUC Usecases.BusinessUseCases) *InventoryController {
	return &InventoryController{inventoryUC: inventoryUC, businessUC: businessUC}
}

// verifyBusinessOwnership checks that the authenticated user owns the business.
// Returns true if access is denied (caller should return early).
func (c *InventoryController) verifyBusinessOwnership(ctx *gin.Context, businessID, userID string) bool {
	business, err := c.businessUC.GetById(businessID)
	if err != nil || business == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "Business not found"})
		return true
	}
	if business.UserID.Hex() != userID {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to access this business"})
		return true
	}
	return false
}

// CreateProduct godoc
// @Summary      Add new product
// @Description  Create a new product with stock information
// @Tags         inventory
// @Accept       json
// @Produce      json
// @Param        businessId  path  string                       true  "Business ID"
// @Param        request     body  Domain.CreateProductRequest  true  "Product details"
// @Success      201  {object}  Domain.ProductResponse
// @Failure      400  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Router       /api/businesses/{businessId}/inventory/products [post]
// @Security     BearerAuth
func (c *InventoryController) CreateProduct(ctx *gin.Context) {
	businessID := ctx.Param("businessId")
	if businessID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Business ID is required"})
		return
	}

	userID, exists := ctx.Get("user_id")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	if c.verifyBusinessOwnership(ctx, businessID, userID.(string)) {
		return
	}

	var req Domain.CreateProductRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	product, err := c.inventoryUC.CreateProduct(businessID, userID.(string), req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, product)
}

// GetProducts godoc
// @Summary      List all products
// @Description  Get products with filtering, search and pagination
// @Tags         inventory
// @Produce      json
// @Param        businessId      path    string  true   "Business ID"
// @Param        search          query   string  false  "Search product name"
// @Param        low_stock_only  query   bool    false  "Filter low stock products"
// @Param        page            query   int     false  "Page number (default: 1)"
// @Param        limit           query   int     false  "Results per page (default: 50)"
// @Param        sort            query   string  false  "Sort field (name, stock, created_at)"
// @Param        order           query   string  false  "Sort order (asc, desc)"
// @Success      200  {object}  Domain.ProductListResponse
// @Failure      400  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Router       /api/businesses/{businessId}/inventory/products [get]
// @Security     BearerAuth
func (c *InventoryController) GetProducts(ctx *gin.Context) {
	businessID := ctx.Param("businessId")
	if businessID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Business ID is required"})
		return
	}

	var query Domain.ProductListQuery
	if err := ctx.ShouldBindQuery(&query); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	products, err := c.inventoryUC.GetProducts(businessID, query)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, products)
}

// GetProduct godoc
// @Summary      Get product details
// @Description  Get detailed information about a specific product
// @Tags         inventory
// @Produce      json
// @Param        businessId  path  string  true  "Business ID"
// @Param        productId   path  string  true  "Product ID"
// @Success      200  {object}  Domain.ProductResponse
// @Failure      400  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Router       /api/businesses/{businessId}/inventory/products/{productId} [get]
// @Security     BearerAuth
func (c *InventoryController) GetProduct(ctx *gin.Context) {
	businessID := ctx.Param("businessId")
	if businessID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Business ID is required"})
		return
	}

	productID := ctx.Param("productId")
	if productID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Product ID is required"})
		return
	}

	product, err := c.inventoryUC.GetProductByID(productID, businessID)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, product)
}

// UpdateProduct godoc
// @Summary      Update product info
// @Description  Update product information (name, price, threshold)
// @Tags         inventory
// @Accept       json
// @Produce      json
// @Param        businessId  path  string                       true  "Business ID"
// @Param        productId   path  string                       true  "Product ID"
// @Param        request     body  Domain.UpdateProductRequest  true  "Product update details"
// @Success      200  {object}  Domain.ProductResponse
// @Failure      400  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Router       /api/businesses/{businessId}/inventory/products/{productId} [patch]
// @Security     BearerAuth
func (c *InventoryController) UpdateProduct(ctx *gin.Context) {
	businessID := ctx.Param("businessId")
	if businessID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Business ID is required"})
		return
	}

	productID := ctx.Param("productId")
	if productID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Product ID is required"})
		return
	}

	userID, exists := ctx.Get("user_id")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	if c.verifyBusinessOwnership(ctx, businessID, userID.(string)) {
		return
	}

	var req Domain.UpdateProductRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	product, err := c.inventoryUC.UpdateProduct(productID, businessID, userID.(string), req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, product)
}

// DeleteProduct godoc
// @Summary      Delete product
// @Description  Delete a product from inventory
// @Tags         inventory
// @Produce      json
// @Param        businessId  path  string  true  "Business ID"
// @Param        productId   path  string  true  "Product ID"
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Router       /api/businesses/{businessId}/inventory/products/{productId} [delete]
// @Security     BearerAuth
func (c *InventoryController) DeleteProduct(ctx *gin.Context) {
	businessID := ctx.Param("businessId")
	if businessID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Business ID is required"})
		return
	}

	productID := ctx.Param("productId")
	if productID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Product ID is required"})
		return
	}

	userID, exists := ctx.Get("user_id")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	if c.verifyBusinessOwnership(ctx, businessID, userID.(string)) {
		return
	}

	if err := c.inventoryUC.DeleteProduct(productID, businessID, userID.(string)); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Product deleted successfully"})
}

// AdjustStock godoc
// @Summary      Manually adjust stock
// @Description  Manually adjust product stock with movement type and reason
// @Tags         inventory
// @Accept       json
// @Produce      json
// @Param        businessId  path  string                     true  "Business ID"
// @Param        productId   path  string                     true  "Product ID"
// @Param        request     body  Domain.AdjustStockRequest  true  "Stock adjustment details"
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Router       /api/businesses/{businessId}/inventory/products/{productId}/adjust [post]
// @Security     BearerAuth
func (c *InventoryController) AdjustStock(ctx *gin.Context) {
	businessID := ctx.Param("businessId")
	if businessID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Business ID is required"})
		return
	}

	productID := ctx.Param("productId")
	if productID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Product ID is required"})
		return
	}

	userID, exists := ctx.Get("user_id")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	if c.verifyBusinessOwnership(ctx, businessID, userID.(string)) {
		return
	}

	var req Domain.AdjustStockRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := c.inventoryUC.AdjustStock(productID, businessID, userID.(string), req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Stock adjusted successfully"})
}

// GetLowStock godoc
// @Summary      Get products below threshold
// @Description  Get products with stock below minimum threshold
// @Tags         inventory
// @Produce      json
// @Param        businessId  path    string  true   "Business ID"
// @Success      200  {array}   Domain.ProductResponse
// @Failure      400  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Router       /api/businesses/{businessId}/inventory/products/low-stock [get]
// @Security     BearerAuth
func (c *InventoryController) GetLowStock(ctx *gin.Context) {
	businessID := ctx.Param("businessId")
	if businessID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Business ID is required"})
		return
	}

	products, err := c.inventoryUC.GetLowStock(businessID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, products)
}

// GetStockHistory godoc
// @Summary      Get stock movement history
// @Description  Get history of stock changes for a product
// @Tags         inventory
// @Produce      json
// @Param        businessId  path  string  true   "Business ID"
// @Param        productId   path  string  true   "Product ID"
// @Param        limit       query int     false  "Limit results (default: 50)"
// @Success      200  {array}   Domain.StockMovementResponse
// @Failure      400  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Router       /api/businesses/{businessId}/inventory/products/{productId}/history [get]
// @Security     BearerAuth
func (c *InventoryController) GetStockHistory(ctx *gin.Context) {
	businessID := ctx.Param("businessId")
	if businessID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Business ID is required"})
		return
	}

	productID := ctx.Param("productId")
	if productID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Product ID is required"})
		return
	}

	limit := 50
	if limitStr := ctx.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	history, err := c.inventoryUC.GetStockHistory(productID, businessID, limit)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, history)
}
