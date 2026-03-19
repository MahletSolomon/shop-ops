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

// TransactionController handles HTTP requests for unified transactions
type TransactionController struct {
	transactionUseCases *usecases.TransactionUseCases
	businessUseCases    usecases.BusinessUseCases
}

// TransactionResponse represents a single transaction in the API response
type TransactionResponse struct {
	ID          string          `json:"id"`
	Type        string          `json:"type"`
	Date        time.Time       `json:"date"`
	Amount      decimal.Decimal `json:"amount"`
	ProductID   *string         `json:"product_id"`
	ProductName *string         `json:"product_name"`
	Category    *string         `json:"category"`
	Description string          `json:"description"`
	CreatedAt   time.Time       `json:"created_at"`
}

// TransactionPaginationResponse represents pagination info in the API response
type TransactionPaginationResponse struct {
	CurrentPage  int   `json:"current_page"`
	TotalPages   int   `json:"total_pages"`
	TotalRecords int64 `json:"total_records"`
	PerPage      int   `json:"per_page"`
}

// TransactionListResponse represents the paginated list response
type TransactionListResponse struct {
	Data       []TransactionResponse         `json:"data"`
	Pagination TransactionPaginationResponse `json:"pagination"`
}

// NewTransactionController creates a new TransactionController
func NewTransactionController(
	transactionUseCases *usecases.TransactionUseCases,
	businessUseCases usecases.BusinessUseCases,
) *TransactionController {
	return &TransactionController{
		transactionUseCases: transactionUseCases,
		businessUseCases:    businessUseCases,
	}
}

// GetTransactions - GET /transactions
// Query Parameters:
// - business_id: required, the business ID
// - start_date: optional, ISO 8601 date string
// - end_date: optional, ISO 8601 date string
// - type: optional, "sale", "expense", or "all"
// - category: optional, expense category filter
// - product_id: optional, filter by product
// - min_amount: optional, minimum transaction amount
// - max_amount: optional, maximum transaction amount
// - search: optional, search in descriptions/notes
// - page: optional, page number (default: 1)
// - limit: optional, results per page (default: 50)
// - sort: optional, sort field (date, amount)
// - order: optional, sort order (asc, desc)
func (ctrl *TransactionController) GetTransactions(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		log.Println("❌ User ID not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
			"code":  "AUTH_001",
		})
		return
	}

	// Get and validate business ID
	businessIDStr := c.Query("business_id")
	if businessIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "business_id is required",
			"code":  "VAL_001",
		})
		return
	}

	businessID, err := primitive.ObjectIDFromHex(businessIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid business_id format",
			"code":  "VAL_002",
		})
		return
	}

	// Verify user has access to this business
	business, err := ctrl.businessUseCases.GetById(businessIDStr)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Business not found",
			"code":  "BIZ_001",
		})
		return
	}

	if business.UserID.Hex() != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "You don't have permission to access this business",
			"code":  "AUTH_003",
		})
		return
	}

	// Parse query parameters
	filterReq := usecases.TransactionFilterRequest{
		BusinessID: businessID,
	}

	// Parse start_date
	if startDateStr := c.Query("start_date"); startDateStr != "" {
		startDate, err := time.Parse(time.RFC3339, startDateStr)
		if err != nil {
			// Try parsing date-only format
			startDate, err = time.Parse("2006-01-02", startDateStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "Invalid start_date format. Use ISO 8601 (e.g., 2024-01-01 or 2024-01-01T00:00:00Z)",
					"code":  "VAL_003",
				})
				return
			}
		}
		filterReq.StartDate = &startDate
	}

	// Parse end_date
	if endDateStr := c.Query("end_date"); endDateStr != "" {
		endDate, err := time.Parse(time.RFC3339, endDateStr)
		if err != nil {
			// Try parsing date-only format
			endDate, err = time.Parse("2006-01-02", endDateStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "Invalid end_date format. Use ISO 8601 (e.g., 2024-01-31 or 2024-01-31T23:59:59Z)",
					"code":  "VAL_004",
				})
				return
			}
			// Set to end of day for date-only format
			endDate = endDate.Add(24*time.Hour - time.Second)
		}
		filterReq.EndDate = &endDate
	}

	// Parse type
	if typeStr := c.Query("type"); typeStr != "" {
		filterReq.Type = &typeStr
	}

	// Parse category
	if category := c.Query("category"); category != "" {
		filterReq.Category = &category
	}

	// Parse product_id
	if productID := c.Query("product_id"); productID != "" {
		filterReq.ProductID = &productID
	}

	// Parse min_amount
	if minAmountStr := c.Query("min_amount"); minAmountStr != "" {
		minAmount, err := strconv.ParseFloat(minAmountStr, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid min_amount format",
				"code":  "VAL_005",
			})
			return
		}
		filterReq.MinAmount = &minAmount
	}

	// Parse max_amount
	if maxAmountStr := c.Query("max_amount"); maxAmountStr != "" {
		maxAmount, err := strconv.ParseFloat(maxAmountStr, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid max_amount format",
				"code":  "VAL_006",
			})
			return
		}
		filterReq.MaxAmount = &maxAmount
	}

	// Parse search
	filterReq.Search = c.Query("search")

	// Parse pagination
	if pageStr := c.Query("page"); pageStr != "" {
		page, err := strconv.Atoi(pageStr)
		if err != nil || page < 1 {
			page = 1
		}
		filterReq.Page = page
	} else {
		filterReq.Page = 1
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		limit, err := strconv.Atoi(limitStr)
		if err != nil || limit < 1 {
			limit = 50
		}
		if limit > 100 {
			limit = 100 // Cap at 100
		}
		filterReq.Limit = limit
	} else {
		filterReq.Limit = 50
	}

	// Parse sorting
	if sort := c.Query("sort"); sort != "" {
		filterReq.Sort = sort
	} else {
		filterReq.Sort = "date"
	}

	if order := c.Query("order"); order != "" {
		filterReq.Order = order
	} else {
		filterReq.Order = "desc"
	}

	// Get transactions
	result, err := ctrl.transactionUseCases.GetTransactions(filterReq)
	if err != nil {
		log.Printf("❌ Error fetching transactions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch transactions",
			"code":  "SYS_001",
		})
		return
	}

	// Convert to response format
	response := toTransactionListResponse(result)

	c.JSON(http.StatusOK, response)
}

// Helper function to convert domain model to response
func toTransactionListResponse(list *domain.TransactionList) TransactionListResponse {
	data := make([]TransactionResponse, 0, len(list.Data))

	for _, txn := range list.Data {
		data = append(data, TransactionResponse{
			ID:          txn.ID,
			Type:        string(txn.Type),
			Date:        txn.Date,
			Amount:      txn.Amount,
			ProductID:   txn.ProductID,
			ProductName: txn.ProductName,
			Category:    txn.Category,
			Description: txn.Description,
			CreatedAt:   txn.CreatedAt,
		})
	}

	return TransactionListResponse{
		Data: data,
		Pagination: TransactionPaginationResponse{
			CurrentPage:  list.Pagination.CurrentPage,
			TotalPages:   list.Pagination.TotalPages,
			TotalRecords: list.Pagination.TotalRecords,
			PerPage:      list.Pagination.PerPage,
		},
	}
}
