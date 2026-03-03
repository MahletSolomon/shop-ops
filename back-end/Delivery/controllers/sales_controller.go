package controllers

import (
	"net/http"

	Domain "shop-ops/Domain"
	Usecases "shop-ops/Usecases"

	"github.com/gin-gonic/gin"
)

// SalesController handles HTTP requests for the sales feature
type SalesController struct {
	salesUC    Usecases.SalesUseCase
	businessUC Usecases.BusinessUseCases
}

// NewSalesController creates a new SalesController
func NewSalesController(salesUC Usecases.SalesUseCase, businessUC Usecases.BusinessUseCases) *SalesController {
	return &SalesController{salesUC: salesUC, businessUC: businessUC}
}

// verifyBusinessOwnership checks that the authenticated user owns the business.
// Returns true if access is denied (caller should return early).
func (c *SalesController) verifyBusinessOwnership(ctx *gin.Context, businessID, userID string) bool {
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

// CreateSale godoc
// @Summary      Record a new sale
// @Description  Record a sales transaction; optionally link to a product (which auto-decrements stock)
// @Tags         sales
// @Accept       json
// @Produce      json
// @Param        businessId  path   string                    true  "Business ID"
// @Param        request     body   Domain.CreateSaleRequest  true  "Sale details"
// @Success      201  {object}  Domain.SaleResponse
// @Failure      400  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Router       /api/businesses/{businessId}/sales [post]
// @Security     BearerAuth
func (c *SalesController) CreateSale(ctx *gin.Context) {
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

	var req Domain.CreateSaleRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.UnitPrice <= 0 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "unit_price must be greater than 0"})
		return
	}
	if req.Quantity <= 0 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "quantity must be greater than 0"})
		return
	}

	sale, err := c.salesUC.CreateSale(businessID, userID.(string), req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, sale)
}

// GetSales godoc
// @Summary      List all sales
// @Description  Returns paginated sales with optional date, product, and amount filters
// @Tags         sales
// @Produce      json
// @Param        businessId  path    string  true   "Business ID"
// @Param        start_date  query   string  false  "Start date (YYYY-MM-DD)"
// @Param        end_date    query   string  false  "End date (YYYY-MM-DD)"
// @Param        product_id  query   string  false  "Filter by product ID"
// @Param        min_amount  query   number  false  "Minimum sale total"
// @Param        max_amount  query   number  false  "Maximum sale total"
// @Param        page        query   int     false  "Page number (default: 1)"
// @Param        limit       query   int     false  "Results per page (default: 50)"
// @Param        sort        query   string  false  "Sort field (created_at, total)"
// @Param        order       query   string  false  "Sort order (asc, desc)"
// @Success      200  {object}  Domain.SaleListResponse
// @Failure      400  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Router       /api/businesses/{businessId}/sales [get]
// @Security     BearerAuth
func (c *SalesController) GetSales(ctx *gin.Context) {
	businessID := ctx.Param("businessId")
	if businessID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Business ID is required"})
		return
	}

	var query Domain.SaleListQuery
	if err := ctx.ShouldBindQuery(&query); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := ctx.GetString("user_id")
	if userID == "" {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	if c.verifyBusinessOwnership(ctx, businessID, userID) {
		return
	}

	sales, err := c.salesUC.GetSales(businessID, query)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, sales)
}

// GetSale godoc
// @Summary      Get sale details
// @Description  Get detailed information about a specific sale
// @Tags         sales
// @Produce      json
// @Param        businessId  path  string  true  "Business ID"
// @Param        saleId      path  string  true  "Sale ID"
// @Success      200  {object}  Domain.SaleResponse
// @Failure      400  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Router       /api/businesses/{businessId}/sales/{saleId} [get]
// @Security     BearerAuth
func (c *SalesController) GetSale(ctx *gin.Context) {
	businessID := ctx.Param("businessId")
	if businessID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Business ID is required"})
		return
	}

	saleID := ctx.Param("saleId")
	if saleID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Sale ID is required"})
		return
	}

	userID := ctx.GetString("user_id")
	if userID == "" {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	if c.verifyBusinessOwnership(ctx, businessID, userID) {
		return
	}

	sale, err := c.salesUC.GetSaleByID(saleID, businessID)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, sale)
}

// VoidSale godoc
// @Summary      Void a sale
// @Description  Soft-delete a sale (marks as voided); reverses inventory stock if product was linked
// @Tags         sales
// @Produce      json
// @Param        businessId  path  string  true  "Business ID"
// @Param        saleId      path  string  true  "Sale ID"
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Router       /api/businesses/{businessId}/sales/{saleId} [delete]
// @Security     BearerAuth
func (c *SalesController) VoidSale(ctx *gin.Context) {
	businessID := ctx.Param("businessId")
	if businessID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Business ID is required"})
		return
	}

	saleID := ctx.Param("saleId")
	if saleID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Sale ID is required"})
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

	if err := c.salesUC.VoidSale(saleID, businessID, userID.(string)); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Sale voided successfully"})
}

// GetSalesSummary godoc
// @Summary      Get sales summary
// @Description  Returns total revenue, count, and voided count for a given period
// @Tags         sales
// @Produce      json
// @Param        businessId  path    string  true   "Business ID"
// @Param        start_date  query   string  false  "Start date (YYYY-MM-DD, default: 30 days ago)"
// @Param        end_date    query   string  false  "End date (YYYY-MM-DD, default: today)"
// @Success      200  {object}  Domain.SaleSummaryResponse
// @Failure      400  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Router       /api/businesses/{businessId}/sales/summary [get]
// @Security     BearerAuth
func (c *SalesController) GetSalesSummary(ctx *gin.Context) {
	businessID := ctx.Param("businessId")
	if businessID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Business ID is required"})
		return
	}

	startDate := ctx.Query("start_date")
	endDate := ctx.Query("end_date")

	userID := ctx.GetString("user_id")
	if userID == "" {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	if c.verifyBusinessOwnership(ctx, businessID, userID) {
		return
	}

	summary, err := c.salesUC.GetSalesSummary(businessID, startDate, endDate)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, summary)
}

// UpdateSale godoc
// @Summary      Update a sale
// @Description  Update the note of a sale before it has been synced
// @Tags         sales
// @Accept       json
// @Produce      json
// @Param        businessId  path  string                    true  "Business ID"
// @Param        saleId      path  string                    true  "Sale ID"
// @Param        request     body  Domain.UpdateSaleRequest  true  "Fields to update"
// @Success      200  {object}  Domain.SaleResponse
// @Failure      400  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Router       /api/businesses/{businessId}/sales/{saleId} [patch]
// @Security     BearerAuth
func (c *SalesController) UpdateSale(ctx *gin.Context) {
	businessID := ctx.Param("businessId")
	if businessID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Business ID is required"})
		return
	}

	saleID := ctx.Param("saleId")
	if saleID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Sale ID is required"})
		return
	}

	var req Domain.UpdateSaleRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := ctx.GetString("user_id")
	if userID == "" {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	if c.verifyBusinessOwnership(ctx, businessID, userID) {
		return
	}

	sale, err := c.salesUC.UpdateSale(saleID, businessID, req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, sale)
}

// GetSalesStats godoc
// @Summary      Get sales statistics
// @Description  Returns daily, weekly, and monthly sales statistics for a business
// @Tags         sales
// @Produce      json
// @Param        businessId  path  string  true  "Business ID"
// @Success      200  {object}  Domain.SaleStatsResponse
// @Failure      400  {object}  map[string]interface{}
// @Failure      401  {object}  map[string]interface{}
// @Router       /api/businesses/{businessId}/sales/stats [get]
// @Security     BearerAuth
func (c *SalesController) GetSalesStats(ctx *gin.Context) {
	businessID := ctx.Param("businessId")
	if businessID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Business ID is required"})
		return
	}

	userID := ctx.GetString("user_id")
	if userID == "" {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	if c.verifyBusinessOwnership(ctx, businessID, userID) {
		return
	}

	stats, err := c.salesUC.GetSalesStats(businessID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, stats)
}
