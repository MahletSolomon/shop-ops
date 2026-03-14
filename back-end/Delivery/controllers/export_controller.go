package controllers

import (
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	Domain "shop-ops/Domain"
	Usecases "shop-ops/Usecases"

	"github.com/gin-gonic/gin"
)

type ExportController struct {
	exportUC   Domain.ExportUsecases
	businessUC Usecases.BusinessUseCases
}

func NewExportController(exportUC Domain.ExportUsecases, businessUC Usecases.BusinessUseCases) *ExportController {
	return &ExportController{
		exportUC:   exportUC,
		businessUC: businessUC,
	}
}

// verifyBusinessOwnership checks that the authenticated user owns the business.
func (c *ExportController) verifyBusinessOwnership(ctx *gin.Context, businessID, userID string) bool {
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

type CreateExportRequest struct {
	BusinessID string                 `json:"business_id"`
	Type       string                 `json:"type"`
	Format     string                 `json:"format"`
	Filters    map[string]interface{} `json:"filters"`
	Fields     []string               `json:"fields"`
}

// RequestExport godoc
// @Summary      Create an export request
// @Description  Asynchronously generate a CSV export of sales, expenses, or transactions
// @Tags         export
// @Accept       json
// @Produce      json
// @Param        request  body      CreateExportRequest  true  "Export parameters"
// @Success      201      {object}  Domain.ExportRequest
// @Failure      400      {object}  map[string]interface{}
// @Failure      401      {object}  map[string]interface{}
// @Failure      403      {object}  map[string]interface{}
// @Router       /api/export [post]
// @Security     BearerAuth
func (c *ExportController) RequestExport(ctx *gin.Context) {
	var req CreateExportRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.BusinessID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "business_id is required"})
		return
	}

	userID := ctx.GetString("user_id")
	if userID == "" {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	if c.verifyBusinessOwnership(ctx, req.BusinessID, userID) {
		return
	}

	exportReq, err := c.exportUC.RequestExport(req.BusinessID, userID, req.Type, req.Format, req.Filters, req.Fields)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, exportReq)
}

// GetExportStatus godoc
// @Summary      Get the status of an export request
// @Description  Check if the async export has completed and get the file download URL if so
// @Tags         export
// @Produce      json
// @Param        exportId    path    string  true   "Export ID"
// @Param        business_id query   string  true   "Business ID"
// @Success      200         {object}  Domain.ExportRequest
// @Failure      400         {object}  map[string]interface{}
// @Failure      401         {object}  map[string]interface{}
// @Failure      404         {object}  map[string]interface{}
// @Router       /api/export/{exportId} [get]
// @Security     BearerAuth
func (c *ExportController) GetExportStatus(ctx *gin.Context) {
	exportID := ctx.Param("exportId")
	businessID := ctx.Query("business_id")
	if businessID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "business_id query parameter is required"})
		return
	}

	userID := ctx.GetString("user_id")
	if c.verifyBusinessOwnership(ctx, businessID, userID) {
		return
	}

	exportReq, err := c.exportUC.GetExportStatus(exportID, businessID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if exportReq == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "Export request not found"})
		return
	}

	ctx.JSON(http.StatusOK, exportReq)
}

// GetExportHistory godoc
// @Summary      List all exports for a business
// @Description  Get a paginated list of all export requests
// @Tags         export
// @Produce      json
// @Param        business_id query   string  true   "Business ID"
// @Param        page        query   int     false  "Page number"
// @Param        limit       query   int     false  "Results per page"
// @Success      200         {object}  map[string]interface{}
// @Failure      400         {object}  map[string]interface{}
// @Failure      401         {object}  map[string]interface{}
// @Router       /api/export/history [get]
// @Security     BearerAuth
func (c *ExportController) GetExportHistory(ctx *gin.Context) {
	businessID := ctx.Query("business_id")
	if businessID == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "business_id query parameter is required"})
		return
	}

	userID := ctx.GetString("user_id")
	if c.verifyBusinessOwnership(ctx, businessID, userID) {
		return
	}

	pageStr := ctx.DefaultQuery("page", "1")
	limitStr := ctx.DefaultQuery("limit", "50")

	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)

	requests, total, err := c.exportUC.GetExportHistory(businessID, page, limit)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"data":  requests,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// DownloadExport godoc
// @Summary      Download the exported file
// @Description  Provides the physical file associated with the export
// @Tags         export
// @Produce      application/octet-stream
// @Param        filename path    string  true   "Filename"
// @Success      200      {file}    binary
// @Failure      404      {object}  map[string]interface{}
// @Router       /download/{filename} [get]
// @Security     BearerAuth
func (c *ExportController) DownloadExport(ctx *gin.Context) {
	filename := ctx.Param("filename")
	if filename == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Filename is required"})
		return
	}

	// Just checking the base dir from project scope for simplicity, you could use an env variable
	filePath := filepath.Join("tmp", "exports", filename)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	ctx.File(filePath)
}
