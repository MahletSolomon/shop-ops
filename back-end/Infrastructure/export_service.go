package infrastructure

import (
	"encoding/csv"
	"fmt"
	"os"
	"path/filepath"
	Domain "shop-ops/Domain"
	"strings"
	"time"
)

const defaultExportRetention = 7 * 24 * time.Hour

// ExportService handles the creation of export files like CSVs
type ExportService struct {
	baseDir string // Directory where exports are saved
}

// NewExportService creates a new ExportService
func NewExportService(baseDir string) *ExportService {
	// Create the directory if it doesn't exist
	if err := os.MkdirAll(baseDir, 0755); err != nil {
		fmt.Printf("Warning: failed to create export directory: %v\n", err)
	}

	service := &ExportService{
		baseDir: baseDir,
	}

	if err := service.cleanupOldExports(defaultExportRetention); err != nil {
		fmt.Printf("Warning: failed to cleanup old export files: %v\n", err)
	}

	return service
}

// cleanupOldExports removes CSV files older than maxAge from the export directory.
func (s *ExportService) cleanupOldExports(maxAge time.Duration) error {
	entries, err := os.ReadDir(s.baseDir)
	if err != nil {
		return err
	}

	cutoff := time.Now().Add(-maxAge)
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		name := entry.Name()
		if !strings.HasSuffix(strings.ToLower(name), ".csv") {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}
		if info.ModTime().After(cutoff) {
			continue
		}

		filePath := filepath.Join(s.baseDir, name)
		if err := os.Remove(filePath); err != nil && !os.IsNotExist(err) {
			return err
		}
	}

	return nil
}

// GenerateSalesCSV creates a CSV file for sales
func (s *ExportService) GenerateSalesCSV(exportID string, sales []Domain.Sale) (string, error) {
	if s == nil {
		return "", fmt.Errorf("export service is not initialized")
	}

	filename := fmt.Sprintf("sales_export_%s_%d.csv", exportID, time.Now().Unix())
	filepath := filepath.Join(s.baseDir, filename)

	file, err := os.Create(filepath)
	if err != nil {
		return "", fmt.Errorf("failed to create CSV file: %w", err)
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	// Write headers
	headers := []string{"ID", "Date", "Amount", "Product ID", "Quantity", "Description", "Created At", "Voided"}
	if err := writer.Write(headers); err != nil {
		return "", fmt.Errorf("failed to write headers: %w", err)
	}

	// Write data
	for _, sale := range sales {
		productID := ""
		if sale.ProductID != nil {
			productID = sale.ProductID.Hex()
		}

		row := []string{
			sale.ID.Hex(),
			sale.CreatedAt.Format(time.RFC3339),
			fmt.Sprintf("%.2f", sale.Total), // Assuming Total is the amount
			productID,
			fmt.Sprintf("%d", sale.Quantity),
			sale.Note,
			sale.CreatedAt.Format(time.RFC3339),
			fmt.Sprintf("%t", sale.IsVoided),
		}
		if err := writer.Write(row); err != nil {
			return "", fmt.Errorf("failed to write row: %w", err)
		}
	}

	return filename, nil
}

// GenerateExpensesCSV creates a CSV file for expenses
func (s *ExportService) GenerateExpensesCSV(exportID string, expenses []*Domain.Expense) (string, error) {
	if s == nil {
		return "", fmt.Errorf("export service is not initialized")
	}

	filename := fmt.Sprintf("expenses_export_%s_%d.csv", exportID, time.Now().Unix())
	filepath := filepath.Join(s.baseDir, filename)

	file, err := os.Create(filepath)
	if err != nil {
		return "", fmt.Errorf("failed to create CSV file: %w", err)
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	// Write headers
	headers := []string{"ID", "Date", "Amount", "Category", "Description", "Created At", "Voided"}
	if err := writer.Write(headers); err != nil {
		return "", fmt.Errorf("failed to write headers: %w", err)
	}

	// Write data
	for _, expense := range expenses {
		row := []string{
			expense.ID.Hex(),
			expense.CreatedAt.Format(time.RFC3339),
			expense.Amount.String(),
			string(expense.Category),
			expense.Note,
			expense.CreatedAt.Format(time.RFC3339),
			fmt.Sprintf("%t", expense.IsVoided),
		}
		if err := writer.Write(row); err != nil {
			return "", fmt.Errorf("failed to write row: %w", err)
		}
	}

	return filename, nil
}

// GenerateTransactionsCSV creates a CSV file for combined transactions
func (s *ExportService) GenerateTransactionsCSV(exportID string, transactions []*Domain.Transaction) (string, error) {
	if s == nil {
		return "", fmt.Errorf("export service is not initialized")
	}

	filename := fmt.Sprintf("transactions_export_%s_%d.csv", exportID, time.Now().Unix())
	filepath := filepath.Join(s.baseDir, filename)

	file, err := os.Create(filepath)
	if err != nil {
		return "", fmt.Errorf("failed to create CSV file: %w", err)
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	// Write headers
	headers := []string{"Date", "Type", "Amount", "Category", "Product", "Description", "Created At"}
	if err := writer.Write(headers); err != nil {
		return "", fmt.Errorf("failed to write headers: %w", err)
	}

	// Write data
	for _, txn := range transactions {
		category := ""
		if txn.Category != nil {
			category = *txn.Category
		}
		productName := ""
		if txn.ProductName != nil {
			productName = *txn.ProductName
		}

		row := []string{
			txn.Date.Format("2006-01-02"), // Simplified Date
			string(txn.Type),
			txn.Amount.String(),
			category,
			productName,
			txn.Description,
			txn.CreatedAt.Format(time.RFC3339),
		}
		if err := writer.Write(row); err != nil {
			return "", fmt.Errorf("failed to write row: %w", err)
		}
	}

	return filename, nil
}

// GenerateInventoryCSV creates a CSV file for inventory products
func (s *ExportService) GenerateInventoryCSV(exportID string, products []Domain.Product) (string, error) {
	if s == nil {
		return "", fmt.Errorf("export service is not initialized")
	}

	filename := fmt.Sprintf("inventory_export_%s_%d.csv", exportID, time.Now().Unix())
	filepath := filepath.Join(s.baseDir, filename)

	file, err := os.Create(filepath)
	if err != nil {
		return "", fmt.Errorf("failed to create CSV file: %w", err)
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	headers := []string{"ID", "Name", "Default Selling Price", "Stock Quantity", "Low Stock Threshold", "Low Stock", "Created At", "Updated At"}
	if err := writer.Write(headers); err != nil {
		return "", fmt.Errorf("failed to write headers: %w", err)
	}

	for _, product := range products {
		row := []string{
			product.ID.Hex(),
			product.Name,
			product.DefaultSellingPrice.String(),
			fmt.Sprintf("%d", product.StockQuantity),
			fmt.Sprintf("%d", product.LowStockThreshold),
			fmt.Sprintf("%t", product.IsLowStock()),
			product.CreatedAt.Format(time.RFC3339),
			product.UpdatedAt.Format(time.RFC3339),
		}
		if err := writer.Write(row); err != nil {
			return "", fmt.Errorf("failed to write row: %w", err)
		}
	}

	return filename, nil
}

// GenerateProfitCSV creates a CSV file for profit summary
func (s *ExportService) GenerateProfitCSV(exportID string, summary *Domain.ProfitSummaryResponse) (string, error) {
	if s == nil {
		return "", fmt.Errorf("export service is not initialized")
	}
	if summary == nil {
		return "", fmt.Errorf("profit summary is required")
	}

	filename := fmt.Sprintf("profit_export_%s_%d.csv", exportID, time.Now().Unix())
	filepath := filepath.Join(s.baseDir, filename)

	file, err := os.Create(filepath)
	if err != nil {
		return "", fmt.Errorf("failed to create CSV file: %w", err)
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	headers := []string{"Total Sales", "Total Expenses", "Net Profit", "Period"}
	if err := writer.Write(headers); err != nil {
		return "", fmt.Errorf("failed to write headers: %w", err)
	}

	row := []string{
		fmt.Sprintf("%.2f", summary.TotalSales),
		fmt.Sprintf("%.2f", summary.TotalExpenses),
		fmt.Sprintf("%.2f", summary.NetProfit),
		summary.Period,
	}
	if err := writer.Write(row); err != nil {
		return "", fmt.Errorf("failed to write row: %w", err)
	}

	return filename, nil
}

// GetFilePath gets the full path for a given filename
func (s *ExportService) GetFilePath(filename string) string {
	return filepath.Join(s.baseDir, filename)
}
