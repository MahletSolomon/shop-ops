package controllers

import (
	"log"
	"net/http"
	domain "shop-ops/Domain"
	usecases "shop-ops/Usecases"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ExpenseController struct {
	expenseUseCases  *usecases.ExpenseUseCases
	businessUseCases usecases.BusinessUseCases
}

type RecordExpenseRequest struct {
	BusinessID string  `json:"businessId" binding:"required"`
	Category   string  `json:"category" binding:"required"`
	Amount     float64 `json:"amount" binding:"required,min=0.01"`
	Note       string  `json:"note"`
}

type UpdateExpenseRequest struct {
	Category *string  `json:"category"`
	Amount   *float64 `json:"amount" binding:"omitempty,min=0.01"`
	Note     *string  `json:"note"`
}

type ExpenseResponse struct {
	ID         string          `json:"id"`
	BusinessID string          `json:"businessId"`
	Category   string          `json:"category"`
	Amount     decimal.Decimal `json:"amount"`
	Note       string          `json:"note"`
	CreatedAt  time.Time       `json:"createdAt"`
	IsVoided   bool            `json:"isVoided"`
}

type SummaryResponse struct {
	Categories map[string]decimal.Decimal `json:"categories"`
	Total      decimal.Decimal            `json:"total"`
}

type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type PaginationInfo struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
	Total int `json:"total"`
}

type PaginatedResponse struct {
	Data       []ExpenseResponse `json:"data"`
	Pagination PaginationInfo    `json:"pagination"`
}

// NewExpenseController
func NewExpenseController(
	expenseUseCases *usecases.ExpenseUseCases,
	businessUseCases usecases.BusinessUseCases,
) *ExpenseController {
	return &ExpenseController{
		expenseUseCases:  expenseUseCases,
		businessUseCases: businessUseCases,
	}
}

// RecordExpense - POST /expenses
func (ctrl *ExpenseController) RecordExpense(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		log.Println("❌ User ID not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
			"code":  "AUTH_001",
		})
		return
	}
	log.Printf("👤 User authenticated: %s", userID)

	var req RecordExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ Invalid request body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
			"code":    "VAL_001",
		})
		return
	}
	log.Printf("📝 Request body: %+v", req)

	businessID, err := primitive.ObjectIDFromHex(req.BusinessID)
	if err != nil {
		log.Printf("❌ Invalid business ID format: %s", req.BusinessID)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid business ID format",
			"code":  "VAL_002",
		})
		return
	}

	business, err := ctrl.businessUseCases.GetById(req.BusinessID)
	if err != nil {
		log.Printf("❌ Business not found: %v", err)
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Business not found",
			"code":  "BIZ_001",
		})
		return
	}

	if business.UserID.Hex() != userID {
		log.Printf("❌ User %s is not owner of business %s", userID, req.BusinessID)
		c.JSON(http.StatusForbidden, gin.H{
			"error": "You don't have permission to create expenses for this business",
			"code":  "AUTH_003",
		})
		return
	}
	log.Printf("✅ User %s is owner of business %s", userID, req.BusinessID)

	amount := decimal.NewFromFloat(req.Amount)

	expense, err := ctrl.expenseUseCases.RecordExpense(usecases.RecordExpenseRequest{
		BusinessID: businessID,
		Category:   domain.ExpenseCategory(req.Category),
		Amount:     amount,
		Note:       req.Note,
	})

	if err != nil {
		log.Printf("❌ Error creating expense: %v", err)
		switch err {
		case domain.ErrInvalidCategory:
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid expense category",
				"code":  "VAL_003",
			})
		case domain.ErrNegativeAmount:
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Amount must be positive",
				"code":  "VAL_004",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Internal server error",
				"code":  "SYS_001",
			})
		}
		return
	}

	log.Printf("✅ Expense created successfully with ID: %s", expense.ID.Hex())
	c.JSON(http.StatusCreated, toExpenseResponse(expense))
}

func (ctrl *ExpenseController) GetExpenses(c *gin.Context) {

	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Code:    "AUTH_001",
			Message: "User not authenticated",
		})
		return
	}

	businessID := c.Query("businessId")
	if businessID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "VAL_002",
			Message: "businessId is required",
		})
		return
	}

	business, err := ctrl.businessUseCases.GetById(businessID)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{
			Code:    "BIZ_001",
			Message: "Business not found",
		})
		return
	}

	if business.UserID.Hex() != userID {
		c.JSON(http.StatusForbidden, ErrorResponse{
			Code:    "AUTH_003",
			Message: "You don't have access to this business",
		})
		return
	}

	businessObjID, err := primitive.ObjectIDFromHex(businessID)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "VAL_002",
			Message: "Invalid business ID format",
		})
		return
	}

	filter := usecases.ExpenseFilter{}

	if category := c.Query("category"); category != "" {
		cat := domain.ExpenseCategory(category)
		filter.Category = &cat
	}

	if minAmount := c.Query("min_amount"); minAmount != "" {
		if val, err := decimal.NewFromString(minAmount); err == nil {
			filter.MinAmount = &val
		}
	}

	if maxAmount := c.Query("max_amount"); maxAmount != "" {
		if val, err := decimal.NewFromString(maxAmount); err == nil {
			filter.MaxAmount = &val
		}
	}

	var dateRange usecases.DateRange
	if startDate := c.Query("start_date"); startDate != "" {
		if parsed, err := time.Parse("2006-01-02", startDate); err == nil {
			dateRange.StartDate = &parsed
		}
	}
	if endDate := c.Query("end_date"); endDate != "" {
		if parsed, err := time.Parse("2006-01-02", endDate); err == nil {
			endOfDay := parsed.Add(24*time.Hour - time.Second)
			dateRange.EndDate = &endOfDay
		}
	}
	if dateRange.StartDate != nil || dateRange.EndDate != nil {
		filter.DateRange = &dateRange
	}

	//  Pagination
	pagination := usecases.Pagination{
		Page:  1,
		Limit: 50,
		Sort:  c.DefaultQuery("sort", "date"),
		Order: c.DefaultQuery("order", "desc"),
	}

	if page := c.Query("page"); page != "" {
		if val, err := strconv.Atoi(page); err == nil && val > 0 {
			pagination.Page = val
		}
	}

	if limit := c.Query("limit"); limit != "" {
		if val, err := strconv.Atoi(limit); err == nil && val > 0 {
			pagination.Limit = val
		}
	}

	// Get expenses
	expensesList, err := ctrl.expenseUseCases.GetExpenses(businessObjID, filter, pagination)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "SYS_001",
			Message: "Failed to fetch expenses",
		})
		return
	}

	// 8. Convert the response
	response := make([]ExpenseResponse, len(expensesList.Expenses))
	for i, expense := range expensesList.Expenses {
		response[i] = toExpenseResponse(expense)
	}

	c.JSON(http.StatusOK, PaginatedResponse{
		Data: response,
		Pagination: PaginationInfo{
			Page:  expensesList.Page,
			Limit: expensesList.Limit,
			Total: int(expensesList.Total),
		},
	})
}

// GetExpenseById - GET /expenses/:expenseId
func (ctrl *ExpenseController) GetExpenseById(c *gin.Context) {

	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Code:    "AUTH_001",
			Message: "User not authenticated",
		})
		return
	}

	expenseID := c.Param("expenseId")
	if expenseID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "VAL_002",
			Message: "expenseId is required",
		})
		return
	}

	expenseObjID, err := primitive.ObjectIDFromHex(expenseID)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "VAL_002",
			Message: "Invalid expense ID format",
		})
		return
	}

	expense, err := ctrl.expenseUseCases.GetExpenseById(expenseObjID)
	if err != nil {
		if err == domain.ErrExpenseNotFound {
			c.JSON(http.StatusNotFound, ErrorResponse{
				Code:    "NOT_001",
				Message: "Expense not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "SYS_001",
			Message: "Failed to fetch expense",
		})
		return
	}

	business, err := ctrl.businessUseCases.GetById(expense.BusinessID.Hex())
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{
			Code:    "BIZ_001",
			Message: "Associated business not found",
		})
		return
	}

	if business.UserID.Hex() != userID {
		c.JSON(http.StatusForbidden, ErrorResponse{
			Code:    "AUTH_003",
			Message: "You don't have access to this expense",
		})
		return
	}

	c.JSON(http.StatusOK, toExpenseResponse(expense))
}

// UpdateExpense - PATCH /expenses/:expenseId
func (ctrl *ExpenseController) UpdateExpense(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Code:    "AUTH_001",
			Message: "User not authenticated",
		})
		return
	}

	expenseID := c.Param("expenseId")
	if expenseID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "VAL_002",
			Message: "expenseId is required",
		})
		return
	}

	expenseObjID, err := primitive.ObjectIDFromHex(expenseID)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "VAL_002",
			Message: "Invalid expense ID format",
		})
		return
	}

	var req UpdateExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "VAL_001",
			Message: "Invalid request body: " + err.Error(),
		})
		return
	}

	expense, err := ctrl.expenseUseCases.GetExpenseById(expenseObjID)
	if err != nil {
		if err == domain.ErrExpenseNotFound {
			c.JSON(http.StatusNotFound, ErrorResponse{
				Code:    "NOT_001",
				Message: "Expense not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "SYS_001",
			Message: "Failed to fetch expense",
		})
		return
	}

	business, err := ctrl.businessUseCases.GetById(expense.BusinessID.Hex())
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{
			Code:    "BIZ_001",
			Message: "Associated business not found",
		})
		return
	}

	if business.UserID.Hex() != userID {
		c.JSON(http.StatusForbidden, ErrorResponse{
			Code:    "AUTH_003",
			Message: "You don't have permission to update this expense",
		})
		return
	}

	// Map controller request to usecase request
	useCaseReq := usecases.UpdateExpenseRequest{}

	if req.Category != nil {
		cat := domain.ExpenseCategory(*req.Category)
		useCaseReq.Category = &cat
	}

	if req.Amount != nil {
		amt := decimal.NewFromFloat(*req.Amount)
		useCaseReq.Amount = &amt
	}

	if req.Note != nil {
		useCaseReq.Note = req.Note
	}

	updatedExpense, err := ctrl.expenseUseCases.UpdateExpense(expenseObjID, useCaseReq)
	if err != nil {
		if err == domain.ErrCannotUpdateVoided {
			c.JSON(http.StatusConflict, ErrorResponse{
				Code:    "EXP_001",
				Message: "Cannot update a voided expense",
			})
			return
		}
		if err == domain.ErrInvalidCategory {
			c.JSON(http.StatusBadRequest, ErrorResponse{
				Code:    "VAL_003",
				Message: "Invalid expense category",
			})
			return
		}
		if err == domain.ErrNegativeAmount {
			c.JSON(http.StatusBadRequest, ErrorResponse{
				Code:    "VAL_004",
				Message: "Amount must be positive",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "SYS_001",
			Message: "Failed to update expense",
		})
		return
	}

	c.JSON(http.StatusOK, toExpenseResponse(updatedExpense))
}

// VoidExpense - DELETE /expenses/:expenseId
func (ctrl *ExpenseController) VoidExpense(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Code:    "AUTH_001",
			Message: "User not authenticated",
		})
		return
	}

	expenseID := c.Param("expenseId")
	if expenseID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "VAL_002",
			Message: "expenseId is required",
		})
		return
	}

	expenseObjID, err := primitive.ObjectIDFromHex(expenseID)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "VAL_002",
			Message: "Invalid expense ID format",
		})
		return
	}

	expense, err := ctrl.expenseUseCases.GetExpenseById(expenseObjID)
	if err != nil {
		if err == domain.ErrExpenseNotFound {
			c.JSON(http.StatusNotFound, ErrorResponse{
				Code:    "NOT_001",
				Message: "Expense not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "SYS_001",
			Message: "Failed to fetch expense",
		})
		return
	}

	business, err := ctrl.businessUseCases.GetById(expense.BusinessID.Hex())
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{
			Code:    "BIZ_001",
			Message: "Associated business not found",
		})
		return
	}

	if business.UserID.Hex() != userID {
		c.JSON(http.StatusForbidden, ErrorResponse{
			Code:    "AUTH_003",
			Message: "You don't have permission to void this expense",
		})
		return
	}

	err = ctrl.expenseUseCases.VoidExpense(expenseObjID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "SYS_001",
			Message: "Failed to void expense",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Expense voided successfully",
		"id":      expenseID,
		"voided":  true,
	})
}

// GetSummary - GET /expenses/summary
func (ctrl *ExpenseController) GetSummary(c *gin.Context) {
	// 1. Récupérer l'user_id du token
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Code:    "AUTH_001",
			Message: "User not authenticated",
		})
		return
	}

	businessID := c.Query("businessId")
	if businessID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "VAL_002",
			Message: "businessId is required",
		})
		return
	}

	business, err := ctrl.businessUseCases.GetById(businessID)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{
			Code:    "BIZ_001",
			Message: "Business not found",
		})
		return
	}

	if business.UserID.Hex() != userID {
		c.JSON(http.StatusForbidden, ErrorResponse{
			Code:    "AUTH_003",
			Message: "You don't have access to this business",
		})
		return
	}

	businessObjID, err := primitive.ObjectIDFromHex(businessID)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "VAL_002",
			Message: "Invalid business ID format",
		})
		return
	}

	var dateRange usecases.DateRange
	if start := c.Query("start_date"); start != "" {
		if parsed, err := time.Parse("2006-01-02", start); err == nil {
			dateRange.StartDate = &parsed
		}
	}
	if end := c.Query("end_date"); end != "" {
		if parsed, err := time.Parse("2006-01-02", end); err == nil {
			endOfDay := parsed.Add(24*time.Hour - time.Second)
			dateRange.EndDate = &endOfDay
		}
	}

	summary, err := ctrl.expenseUseCases.GetExpensesByCategory(businessObjID, dateRange)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "SYS_001",
			Message: "Failed to fetch summary",
		})
		return
	}

	c.JSON(http.StatusOK, summary)
}

// GetCategories - GET /expenses/categories
func (ctrl *ExpenseController) GetCategories(c *gin.Context) {
	categories := domain.GetAllExpenseCategories()
	result := make([]string, len(categories))
	for i, cat := range categories {
		result[i] = string(cat)
	}
	c.JSON(http.StatusOK, result)
}

// Helper function pour convertir un Expense en ExpenseResponse
func toExpenseResponse(expense *domain.Expense) ExpenseResponse {
	return ExpenseResponse{
		ID:         expense.ID.Hex(),
		BusinessID: expense.BusinessID.Hex(),
		Category:   string(expense.Category),
		Amount:     expense.Amount,
		Note:       expense.Note,
		CreatedAt:  expense.CreatedAt,
		IsVoided:   expense.IsVoided,
	}
}
