package controllers

import (
	"net/http"
	"time"

	Domain "shop-ops/Domain"
	Usecases "shop-ops/Usecases"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ReportController handles report-related HTTP requests
type ReportController struct {
	reportUC   *Usecases.ReportUsecases
	businessUC Usecases.BusinessUseCases
}

// NewReportController creates a new ReportController
func NewReportController(reportUC *Usecases.ReportUsecases, businessUC Usecases.BusinessUseCases) *ReportController {
	return &ReportController{
		reportUC:   reportUC,
		businessUC: businessUC,
	}
}

// verifyBusinessOwnership checks that the authenticated user owns the business.
// Returns true if access is denied (caller should return early).
func (rc *ReportController) verifyBusinessOwnership(c *gin.Context, businessID, userID string) bool {
	business, err := rc.businessUC.GetById(businessID)
	if err != nil || business == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Business not found"})
		return true
	}
	if business.UserID.Hex() != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to access this business"})
		return true
	}
	return false
}

// parseDateRange parses start_date and end_date from query params.
// Returns false if parsing failed and a response was already sent.
func (rc *ReportController) parseDateRange(c *gin.Context) (Domain.DateRange, bool) {
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	if startDateStr == "" || endDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "start_date and end_date are required"})
		return Domain.DateRange{}, false
	}

	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_date format, use YYYY-MM-DD"})
		return Domain.DateRange{}, false
	}

	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_date format, use YYYY-MM-DD"})
		return Domain.DateRange{}, false
	}

	// Set end date to end of day
	endDate = endDate.Add(24*time.Hour - time.Second)

	return Domain.DateRange{From: startDate, To: endDate}, true
}

// parseGroupBy parses group_by query param
func (rc *ReportController) parseGroupBy(c *gin.Context) Domain.GroupBy {
	groupByStr := c.Query("group_by")
	switch groupByStr {
	case "day":
		return Domain.GroupByDay
	case "week":
		return Domain.GroupByWeek
	case "month":
		return Domain.GroupByMonth
	default:
		return ""
	}
}

// getBusinessID gets business ID from query param and verifies ownership.
// Returns primitive.NilObjectID and false if validation failed (response already sent).
func (rc *ReportController) getBusinessID(c *gin.Context) (primitive.ObjectID, bool) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return primitive.NilObjectID, false
	}

	businessIDStr := c.Query("business_id")
	if businessIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "business_id query parameter is required"})
		return primitive.NilObjectID, false
	}

	businessID, err := primitive.ObjectIDFromHex(businessIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid business_id"})
		return primitive.NilObjectID, false
	}

	// Verify ownership (sends its own JSON response on failure)
	if rc.verifyBusinessOwnership(c, businessIDStr, userID) {
		return primitive.NilObjectID, false
	}

	return businessID, true
}


// GetSalesReport handles GET /reports/sales
func (rc *ReportController) GetSalesReport(c *gin.Context) {
	businessID, ok := rc.getBusinessID(c)
	if !ok {
		return
	}

	dateRange, ok := rc.parseDateRange(c)
	if !ok {
		return
	}

	groupBy := rc.parseGroupBy(c)

	report, err := rc.reportUC.GenerateSalesReport(businessID, dateRange, groupBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, report)
}

// GetExpenseReport handles GET /reports/expenses
func (rc *ReportController) GetExpenseReport(c *gin.Context) {
	businessID, ok := rc.getBusinessID(c)
	if !ok {
		return
	}

	dateRange, ok := rc.parseDateRange(c)
	if !ok {
		return
	}

	groupBy := rc.parseGroupBy(c)

	report, err := rc.reportUC.GenerateExpenseReport(businessID, dateRange, groupBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, report)
}

// GetProfitReport handles GET /reports/profit
func (rc *ReportController) GetProfitReport(c *gin.Context) {
	businessID, ok := rc.getBusinessID(c)
	if !ok {
		return
	}

	dateRange, ok := rc.parseDateRange(c)
	if !ok {
		return
	}

	groupBy := rc.parseGroupBy(c)

	report, err := rc.reportUC.GenerateProfitReport(businessID, dateRange, groupBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, report)
}

// GetInventoryReport handles GET /reports/inventory
func (rc *ReportController) GetInventoryReport(c *gin.Context) {
	businessID, ok := rc.getBusinessID(c)
	if !ok {
		return
	}

	report, err := rc.reportUC.GenerateInventoryReport(businessID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, report)
}
