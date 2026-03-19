package controllers

import (
	"net/http"
	domain "shop-ops/Domain"
	usecases "shop-ops/Usecases"
	"strconv"

	"github.com/gin-gonic/gin"
)

// SyncController handles sync endpoints.
type SyncController struct {
	syncUseCases     *usecases.SyncUseCases
	businessUseCases usecases.BusinessUseCases
}

// NewSyncController creates a SyncController.
func NewSyncController(syncUseCases *usecases.SyncUseCases, businessUseCases usecases.BusinessUseCases) *SyncController {
	return &SyncController{syncUseCases: syncUseCases, businessUseCases: businessUseCases}
}

// SyncBatch handles POST /sync/batch.
func (ctrl *SyncController) SyncBatch(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated", "code": "AUTH_001"})
		return
	}

	var req domain.SyncBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error(), "code": "VAL_001"})
		return
	}

	business, err := ctrl.businessUseCases.GetById(req.BusinessID)
	if err != nil || business == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Business not found", "code": "BIZ_001"})
		return
	}
	if business.UserID.Hex() != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied", "code": "AUTH_003"})
		return
	}

	result, err := ctrl.syncUseCases.SyncBatch(req)
	if err != nil {
		if err.Error() == "maximum 1000 transactions per sync batch" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "code": "SYNC_001"})
			return
		}
		if err.Error() == "device conflict for business" {
			c.JSON(http.StatusConflict, gin.H{"error": "Device is not allowed for this business", "code": "SYNC_002"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "code": "SYNC_003"})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetSyncStatus handles GET /sync/status.
func (ctrl *SyncController) GetSyncStatus(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated", "code": "AUTH_001"})
		return
	}

	businessID := c.Query("business_id")
	if businessID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "business_id is required", "code": "VAL_001"})
		return
	}

	business, err := ctrl.businessUseCases.GetById(businessID)
	if err != nil || business == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Business not found", "code": "BIZ_001"})
		return
	}
	if business.UserID.Hex() != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied", "code": "AUTH_003"})
		return
	}

	status, err := ctrl.syncUseCases.GetStatus(businessID, c.Query("device_id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sync status", "code": "SYS_001"})
		return
	}

	c.JSON(http.StatusOK, status)
}

// GetSyncHistory handles GET /sync/history.
func (ctrl *SyncController) GetSyncHistory(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated", "code": "AUTH_001"})
		return
	}

	businessID := c.Query("business_id")
	if businessID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "business_id is required", "code": "VAL_001"})
		return
	}

	business, err := ctrl.businessUseCases.GetById(businessID)
	if err != nil || business == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Business not found", "code": "BIZ_001"})
		return
	}
	if business.UserID.Hex() != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied", "code": "AUTH_003"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	history, err := ctrl.syncUseCases.GetHistory(businessID, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sync history", "code": "SYS_001"})
		return
	}

	c.JSON(http.StatusOK, history)
}
