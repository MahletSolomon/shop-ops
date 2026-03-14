package usecases

import (
	"errors"
	"fmt"
	"time"

	Domain "shop-ops/Domain"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

var (
	ErrInvalidDateRange              = errors.New("invalid date range")
	ErrBusinessNotFound              = errors.New("business not found")
)

// ReportUsecases handles report business logic
type ReportUsecases struct {
	reportRepo   Domain.ReportRepository
	businessRepo Domain.BusinessRepository
}

// NewReportUsecases creates a new ReportUsecases
func NewReportUsecases(reportRepo Domain.ReportRepository, businessRepo Domain.BusinessRepository) *ReportUsecases {
	return &ReportUsecases{
		reportRepo:   reportRepo,
		businessRepo: businessRepo,
	}
}

// GenerateSalesReport generates a sales report for the given business and date range
func (u *ReportUsecases) GenerateSalesReport(businessID primitive.ObjectID, dateRange Domain.DateRange, groupBy Domain.GroupBy) (*Domain.SalesReport, error) {
	if dateRange.From.After(dateRange.To) {
		return nil, ErrInvalidDateRange
	}

	// Get business for timezone
	business, err := u.businessRepo.FindByID(businessID.Hex())
	if err != nil {
		return nil, fmt.Errorf("failed to get business: %w", err)
	}
	if business == nil {
		return nil, ErrBusinessNotFound
	}

	// Convert dates to business timezone
	businessLoc, err := time.LoadLocation(business.Timezone)
	if err != nil {
		businessLoc = time.UTC // fallback
	}
	localFrom := dateRange.From.In(businessLoc)
	localTo := dateRange.To.In(businessLoc)
	localDateRange := Domain.DateRange{From: localFrom, To: localTo}

	// Get data from repository
	data, err := u.reportRepo.GetSalesReportData(businessID, localDateRange, groupBy)
	if err != nil {
		return nil, fmt.Errorf("failed to get sales report data: %w", err)
	}

	// Build domain object
	report := Domain.NewSalesReport(
		data.TotalSales,
		data.TotalOrders,
		data.TopProducts,
		localFrom,
		localTo,
	)

	if groupBy != "" {
		report.GroupBy = groupBy
		report.GroupedData = data.GroupedData
	}

	return report, nil
}

// GenerateExpenseReport generates an expense report
func (u *ReportUsecases) GenerateExpenseReport(businessID primitive.ObjectID, dateRange Domain.DateRange, groupBy Domain.GroupBy) (*Domain.ExpenseReport, error) {
	if dateRange.From.After(dateRange.To) {
		return nil, ErrInvalidDateRange
	}

	// Get business for timezone
	business, err := u.businessRepo.FindByID(businessID.Hex())
	if err != nil {
		return nil, fmt.Errorf("failed to get business: %w", err)
	}
	if business == nil {
		return nil, ErrBusinessNotFound
	}

	// Convert dates to business timezone
	businessLoc, err := time.LoadLocation(business.Timezone)
	if err != nil {
		businessLoc = time.UTC
	}
	localFrom := dateRange.From.In(businessLoc)
	localTo := dateRange.To.In(businessLoc)
	localDateRange := Domain.DateRange{From: localFrom, To: localTo}

	// Get data
	data, err := u.reportRepo.GetExpenseReportData(businessID, localDateRange, groupBy)
	if err != nil {
		return nil, fmt.Errorf("failed to get expense report data: %w", err)
	}

	// Build domain object
	report := Domain.NewExpenseReport(
		data.TotalExpenses,
		data.TotalTransactions,
		data.ByCategory,
		localFrom,
		localTo,
	)

	if groupBy != "" {
		report.GroupBy = groupBy
		report.GroupedData = data.GroupedData
	}

	return report, nil
}

// GenerateProfitReport generates a profit report
func (u *ReportUsecases) GenerateProfitReport(businessID primitive.ObjectID, dateRange Domain.DateRange, groupBy Domain.GroupBy) (*Domain.ProfitSummary, error) {
	if dateRange.From.After(dateRange.To) {
		return nil, ErrInvalidDateRange
	}

	// Get business for timezone
	business, err := u.businessRepo.FindByID(businessID.Hex())
	if err != nil {
		return nil, fmt.Errorf("failed to get business: %w", err)
	}
	if business == nil {
		return nil, ErrBusinessNotFound
	}

	// Convert dates to business timezone
	businessLoc, err := time.LoadLocation(business.Timezone)
	if err != nil {
		businessLoc = time.UTC
	}
	localFrom := dateRange.From.In(businessLoc)
	localTo := dateRange.To.In(businessLoc)
	localDateRange := Domain.DateRange{From: localFrom, To: localTo}

	// Get data
	data, err := u.reportRepo.GetProfitReportData(businessID, localDateRange, groupBy)
	if err != nil {
		return nil, fmt.Errorf("failed to get profit report data: %w", err)
	}

	// Build domain object
	report := Domain.NewProfitSummary(
		data.TotalSales,
		data.TotalExpenses,
		localFrom,
		localTo,
	)

	if groupBy != "" {
		report.GroupBy = groupBy
		report.GroupedData = data.GroupedData
	}

	return report, nil
}

// GenerateInventoryReport generates an inventory report
func (u *ReportUsecases) GenerateInventoryReport(businessID primitive.ObjectID) (*Domain.InventoryReport, error) {
	// Get business
	business, err := u.businessRepo.FindByID(businessID.Hex())
	if err != nil {
		return nil, fmt.Errorf("failed to get business: %w", err)
	}
	if business == nil {
		return nil, ErrBusinessNotFound
	}

	// Get data
	data, err := u.reportRepo.GetInventoryReportData(businessID)
	if err != nil {
		return nil, fmt.Errorf("failed to get inventory report data: %w", err)
	}

	// Build domain object
	report := Domain.NewInventoryReport(
		data.TotalProducts,
		data.LowStockProducts,
		data.OutOfStockProducts,
	)

	return report, nil
}


