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

// parseDateRange parses start_date and end_date from query params
func (rc *ReportController) parseDateRange(c *gin.Context) (Domain.DateRange, error) {
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	if startDateStr == "" || endDateStr == "" {
		return Domain.DateRange{}, gin.Error{Err: &gin.Error{Err: nil, Type: gin.ErrorTypePublic, Meta: "start_date and end_date are required"}}
	}

	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		return Domain.DateRange{}, gin.Error{Err: err, Type: gin.ErrorTypePublic, Meta: "invalid start_date format, use YYYY-MM-DD"}
	}

	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		return Domain.DateRange{}, gin.Error{Err: err, Type: gin.ErrorTypePublic, Meta: "invalid end_date format, use YYYY-MM-DD"}
	}

	// Set end date to end of day
	endDate = endDate.Add(24*time.Hour - time.Second)

	return Domain.DateRange{From: startDate, To: endDate}, nil
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

// getBusinessID gets business ID from user and verifies ownership
func (rc *ReportController) getBusinessID(c *gin.Context) (primitive.ObjectID, error) {
	userID := c.GetString("user_id")
	if userID == "" {
		return primitive.NilObjectID, gin.Error{Err: nil, Type: gin.ErrorTypePublic, Meta: "user not authenticated"}
	}

	// For reports, we might need business ID from query or assume user's business
	// For now, get user's businesses and use the first one, or require business_id param
	businessIDStr := c.Query("business_id")
	if businessIDStr == "" {
		return primitive.NilObjectID, gin.Error{Err: nil, Type: gin.ErrorTypePublic, Meta: "business_id is required"}
	}

	businessID, err := primitive.ObjectIDFromHex(businessIDStr)
	if err != nil {
		return primitive.NilObjectID, gin.Error{Err: err, Type: gin.ErrorTypePublic, Meta: "invalid business_id"}
	}

	// Verify ownership
	business, err := rc.businessUC.GetById(businessIDStr)
	if err != nil || business == nil {
		return primitive.NilObjectID, gin.Error{Err: nil, Type: gin.ErrorTypePublic, Meta: "business not found"}
	}
	if business.UserID.Hex() != userID {
		return primitive.NilObjectID, gin.Error{Err: nil, Type: gin.ErrorTypePublic, Meta: "access denied"}
	}

	return businessID, nil
}

// GetSalesReport handles GET /reports/sales
func (rc *ReportController) GetSalesReport(c *gin.Context) {
	businessID, err := rc.getBusinessID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	dateRange, err := rc.parseDateRange(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	groupBy := rc.parseGroupBy(c)
	format := c.Query("format")

	report, err := rc.reportUC.GenerateSalesReport(businessID, dateRange, groupBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if format == "csv" {
		c.Header("Content-Type", "text/csv")
		c.Header("Content-Disposition", "attachment; filename=sales_report.csv")
		c.String(http.StatusOK, report.ToCSV())
	} else {
		c.JSON(http.StatusOK, report)
	}
}

// GetExpenseReport handles GET /reports/expenses
func (rc *ReportController) GetExpenseReport(c *gin.Context) {
	businessID, err := rc.getBusinessID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	dateRange, err := rc.parseDateRange(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	groupBy := rc.parseGroupBy(c)
	format := c.Query("format")

	report, err := rc.reportUC.GenerateExpenseReport(businessID, dateRange, groupBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if format == "csv" {
		c.Header("Content-Type", "text/csv")
		c.Header("Content-Disposition", "attachment; filename=expense_report.csv")
		c.String(http.StatusOK, report.ToCSV())
	} else {
		c.JSON(http.StatusOK, report)
	}
}

// GetProfitReport handles GET /reports/profit
func (rc *ReportController) GetProfitReport(c *gin.Context) {
	businessID, err := rc.getBusinessID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	dateRange, err := rc.parseDateRange(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	groupBy := rc.parseGroupBy(c)
	format := c.Query("format")

	report, err := rc.reportUC.GenerateProfitReport(businessID, dateRange, groupBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if format == "csv" {
		c.Header("Content-Type", "text/csv")
		c.Header("Content-Disposition", "attachment; filename=profit_report.csv")
		c.String(http.StatusOK, report.ToCSV())
	} else {
		c.JSON(http.StatusOK, report)
	}
}

// GetInventoryReport handles GET /reports/inventory
func (rc *ReportController) GetInventoryReport(c *gin.Context) {
	businessID, err := rc.getBusinessID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	format := c.Query("format")

	report, err := rc.reportUC.GenerateInventoryReport(businessID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if format == "csv" {
		c.Header("Content-Type", "text/csv")
		c.Header("Content-Disposition", "attachment; filename=inventory_report.csv")
		c.String(http.StatusOK, report.ToCSV())
	} else {
		c.JSON(http.StatusOK, report)
	}
}
