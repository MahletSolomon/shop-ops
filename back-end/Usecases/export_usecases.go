package usecases

import (
	"context"
	"fmt"
	"time"

	Domain "shop-ops/Domain"
	Infrastructure "shop-ops/Infrastructure"
	Repositories "shop-ops/Repositories"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ExportUsecasesImpl struct {
	exportRepo      Domain.ExportRepository
	exportService   *Infrastructure.ExportService
	salesRepo       Domain.SaleRepository
	productRepo     Domain.ProductRepository
	expenseRepo     Repositories.ExpenseRepository
	transactionRepo Repositories.TransactionRepository
}

func NewExportUsecases(
	exportRepo Domain.ExportRepository,
	exportService *Infrastructure.ExportService,
	salesRepo Domain.SaleRepository,
	productRepo Domain.ProductRepository,
	expenseRepo Repositories.ExpenseRepository,
	transactionRepo Repositories.TransactionRepository,
) Domain.ExportUsecases {
	return &ExportUsecasesImpl{
		exportRepo:      exportRepo,
		exportService:   exportService,
		salesRepo:       salesRepo,
		productRepo:     productRepo,
		expenseRepo:     expenseRepo,
		transactionRepo: transactionRepo,
	}
}

func (uc *ExportUsecasesImpl) RequestExport(businessID, userID, exportType, format string, filters map[string]interface{}, fields []string) (*Domain.ExportRequest, error) {
	// Validate type
	if exportType != "sales" && exportType != "expenses" && exportType != "transactions" && exportType != "inventory" && exportType != "profit" {
		return nil, fmt.Errorf("invalid export type: %s", exportType)
	}
	if format != "csv" {
		return nil, fmt.Errorf("unsupported format: %s", format)
	}

	// Parse custom filters (Start Date, End Date, etc.)
	exportFilter := Domain.ExportFilter{}
	if val, ok := filters["start_date"].(string); ok {
		exportFilter.StartDate = val
	}
	if val, ok := filters["end_date"].(string); ok {
		exportFilter.EndDate = val
	}
	if val, ok := filters["category"].(string); ok {
		exportFilter.Category = val
	}
	if val, ok := filters["product_id"].(string); ok {
		exportFilter.ProductID = val
	}
	if val, ok := filters["search"].(string); ok {
		exportFilter.Search = val
	}
	if val, ok := filters["low_stock_only"].(bool); ok {
		exportFilter.LowStockOnly = val
	}
	if val, ok := filters["min_amount"].(float64); ok {
		exportFilter.MinAmount = &val
	}
	if val, ok := filters["max_amount"].(float64); ok {
		exportFilter.MaxAmount = &val
	}

	req := &Domain.ExportRequest{
		BusinessID: businessID,
		UserID:     userID,
		Type:       exportType,
		Format:     format,
		Filters:    exportFilter,
		Fields:     fields,
		Status:     Domain.ExportStatusPending,
	}

	err := uc.exportRepo.Create(req)
	if err != nil {
		return nil, fmt.Errorf("failed to create export request: %w", err)
	}

	// Launch async export generation
	go uc.generateExport(req)

	return req, nil
}

func (uc *ExportUsecasesImpl) GetExportStatus(id, businessID string) (*Domain.ExportRequest, error) {
	return uc.exportRepo.GetByID(id, businessID)
}

func (uc *ExportUsecasesImpl) GetExportHistory(businessID string, page, limit int) ([]Domain.ExportRequest, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 50
	}
	offset := (page - 1) * limit

	requests, err := uc.exportRepo.GetByBusiness(businessID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get export history: %w", err)
	}

	count, err := uc.exportRepo.CountByBusiness(businessID)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count export history: %w", err)
	}

	return requests, count, nil
}

func (uc *ExportUsecasesImpl) generateExport(req *Domain.ExportRequest) {
	var fileURL string
	var err error

	if uc.exportService == nil {
		uc.exportRepo.UpdateStatus(req.ID, Domain.ExportStatusFailed, "", "export service is not initialized")
		return
	}

	// For MVP, we don't strictly apply all domain filters to the repos in the background job,
	// but we fetch up to 10,000 records using the repository's list feature.
	limit := 10000

	switch req.Type {
	case "sales":
		// Setup query
		query := Domain.SaleListQuery{Limit: limit, Page: 1}
		if req.Filters.StartDate != "" {
			query.StartDate = req.Filters.StartDate
		}
		if req.Filters.EndDate != "" {
			query.EndDate = req.Filters.EndDate
		}
		if req.Filters.ProductID != "" {
			query.ProductID = req.Filters.ProductID
		}
		if req.Filters.MinAmount != nil {
			query.MinAmount = *req.Filters.MinAmount
		}
		if req.Filters.MaxAmount != nil {
			query.MaxAmount = *req.Filters.MaxAmount
		}

		var sales []Domain.Sale
		sales, _, err = uc.salesRepo.FindByBusinessID(req.BusinessID, query)
		if err == nil {
			fileURL, err = uc.exportService.GenerateSalesCSV(req.ID, sales)
		}

	case "expenses":
		// Setup query
		query := Repositories.ExpenseFilter{Limit: limit, Page: 1}
		if req.Filters.StartDate != "" {
			if t, e := time.Parse("2006-01-02", req.Filters.StartDate); e == nil {
				query.StartDate = &t
			}
		}
		if req.Filters.EndDate != "" {
			if t, e := time.Parse("2006-01-02", req.Filters.EndDate); e == nil {
				query.EndDate = &t
			}
		}
		if req.Filters.Category != "" {
			cat := Domain.ExpenseCategory(req.Filters.Category)
			query.Category = &cat
		}

		// Map back business ID string to primitive.ObjectID
		objBizID, _ := primitive.ObjectIDFromHex(req.BusinessID)
		query.BusinessID = objBizID

		var expenses []*Domain.Expense
		expenses, _, err = uc.expenseRepo.GetByBusinessID(context.Background(), query)
		if err == nil {
			fileURL, err = uc.exportService.GenerateExpensesCSV(req.ID, expenses)
		}

	case "transactions":
		objBizID, _ := primitive.ObjectIDFromHex(req.BusinessID)
		filter := Domain.NewTransactionFilter(objBizID)
		filter.Limit = limit
		filter.Page = 1

		if req.Filters.StartDate != "" {
			if t, e := time.Parse("2006-01-02", req.Filters.StartDate); e == nil {
				filter.StartDate = &t
			}
		}
		if req.Filters.EndDate != "" {
			if t, e := time.Parse("2006-01-02", req.Filters.EndDate); e == nil {
				filter.EndDate = &t
			}
		}

		var txnList *Domain.TransactionList
		txnList, err = uc.transactionRepo.GetTransactions(context.Background(), *filter)
		if err == nil && txnList != nil {
			fileURL, err = uc.exportService.GenerateTransactionsCSV(req.ID, txnList.Data)
		}

	case "inventory":
		query := Domain.ProductListQuery{Limit: limit, Page: 1}
		query.Search = req.Filters.Search
		query.LowStockOnly = req.Filters.LowStockOnly

		var products []Domain.Product
		products, _, err = uc.productRepo.FindByBusinessID(req.BusinessID, query)
		if err == nil {
			fileURL, err = uc.exportService.GenerateInventoryCSV(req.ID, products)
		}

	case "profit":
		startDate := time.Now().AddDate(0, 0, -30)
		if req.Filters.StartDate != "" {
			startDate, err = time.Parse("2006-01-02", req.Filters.StartDate)
			if err != nil {
				break
			}
		}

		endDate := time.Now()
		if req.Filters.EndDate != "" {
			endDate, err = time.Parse("2006-01-02", req.Filters.EndDate)
			if err != nil {
				break
			}
			endDate = endDate.Add(24*time.Hour - time.Second)
		}

		var salesSummary *Domain.SaleSummaryResponse
		salesSummary, err = uc.salesRepo.GetSummary(req.BusinessID, startDate, endDate)
		if err != nil {
			break
		}

		var objBizID primitive.ObjectID
		objBizID, err = primitive.ObjectIDFromHex(req.BusinessID)
		if err != nil {
			break
		}

		_, totalExpensesDecimal, expenseErr := uc.expenseRepo.GetSummaryByCategory(context.Background(), objBizID, &startDate, &endDate)
		if expenseErr != nil {
			err = expenseErr
			break
		}

		totalExpenses, _ := totalExpensesDecimal.Float64()
		summary := &Domain.ProfitSummaryResponse{
			TotalSales:    salesSummary.TotalRevenue,
			TotalExpenses: totalExpenses,
			NetProfit:     salesSummary.TotalRevenue - totalExpenses,
			Period:        fmt.Sprintf("%s to %s", startDate.Format("2006-01-02"), endDate.Format("2006-01-02")),
		}

		fileURL, err = uc.exportService.GenerateProfitCSV(req.ID, summary)
	}

	if err != nil {
		uc.exportRepo.UpdateStatus(req.ID, Domain.ExportStatusFailed, "", err.Error())
	} else {
		uc.exportRepo.UpdateStatus(req.ID, Domain.ExportStatusCompleted, "/download/"+fileURL, "")
	}
}
