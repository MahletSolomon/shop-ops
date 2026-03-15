package domain

import (
	"time"

	"github.com/shopspring/decimal"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DateRange represents a period of time
type DateRange struct {
	From time.Time `json:"from"`
	To   time.Time `json:"to"`
}

// GroupBy represents how to group report data
type GroupBy string

const (
	GroupByDay   GroupBy = "day"
	GroupByWeek  GroupBy = "week"
	GroupByMonth GroupBy = "month"
)

// TopProduct represents a product with its sales data
type TopProduct struct {
	ProductID   *primitive.ObjectID `json:"product_id"`
	ProductName string              `json:"product_name"`
	TotalSales  decimal.Decimal     `json:"total_sales"`
	Quantity    int                 `json:"quantity"`
}

// SalesReport represents sales analytics for a period
type SalesReport struct {
	TotalSales  decimal.Decimal `json:"total_sales"`
	TotalOrders int             `json:"total_orders"`
	TopProducts []TopProduct    `json:"top_products"`
	StartDate   time.Time       `json:"start_date"`
	EndDate     time.Time       `json:"end_date"`
	GroupBy     GroupBy         `json:"group_by,omitempty"`
	GroupedData []SalesGroup    `json:"grouped_data,omitempty"`
}

// SalesGroup represents grouped sales data
type SalesGroup struct {
	Period     string          `json:"period"`
	TotalSales decimal.Decimal `json:"total_sales"`
	Orders     int             `json:"orders"`
}

// ExpenseByCategory represents expenses grouped by category
type ExpenseByCategory struct {
	Category         string          `json:"category"`
	TotalAmount      decimal.Decimal `json:"total_amount"`
	TransactionCount int             `json:"transaction_count"`
}

// ExpenseReport represents expense analytics for a period
type ExpenseReport struct {
	TotalExpenses     decimal.Decimal     `json:"total_expenses"`
	TotalTransactions int                 `json:"total_transactions"`
	ByCategory        []ExpenseByCategory `json:"by_category"`
	StartDate         time.Time           `json:"start_date"`
	EndDate           time.Time           `json:"end_date"`
	GroupBy           GroupBy             `json:"group_by,omitempty"`
	GroupedData       []ExpenseGroup      `json:"grouped_data,omitempty"`
}

// ExpenseGroup represents grouped expense data
type ExpenseGroup struct {
	Period      string          `json:"period"`
	TotalAmount decimal.Decimal `json:"total_amount"`
	Count       int             `json:"count"`
}

// ProfitSummary represents the calculated profit for a period
type ProfitSummary struct {
	TotalSales    decimal.Decimal `json:"total_sales"`
	TotalExpenses decimal.Decimal `json:"total_expenses"`
	Profit        decimal.Decimal `json:"profit"`
	StartDate     time.Time       `json:"start_date"`
	EndDate       time.Time       `json:"end_date"`
	GroupBy       GroupBy         `json:"group_by,omitempty"`
	GroupedData   []ProfitGroup   `json:"grouped_data,omitempty"`
}

// ProfitGroup represents grouped profit data
type ProfitGroup struct {
	Period   string          `json:"period"`
	Sales    decimal.Decimal `json:"sales"`
	Expenses decimal.Decimal `json:"expenses"`
	Profit   decimal.Decimal `json:"profit"`
}

// InventoryItem represents inventory status for a product
type InventoryItem struct {
	ProductID         primitive.ObjectID `json:"product_id"`
	ProductName       string             `json:"product_name"`
	CurrentStock      int                `json:"current_stock"`
	LowStockThreshold int                `json:"low_stock_threshold"`
	IsLowStock        bool               `json:"is_low_stock"`
}

// InventoryReport represents inventory status
type InventoryReport struct {
	TotalProducts      int             `json:"total_products"`
	LowStockProducts   []InventoryItem `json:"low_stock_products"`
	OutOfStockProducts []InventoryItem `json:"out_of_stock_products"`
	GeneratedAt        time.Time       `json:"generated_at"`
}

// NewProfitSummary creates a new ProfitSummary and calculates profit
func NewProfitSummary(sales, expenses decimal.Decimal, start, end time.Time) *ProfitSummary {
	profit := sales.Sub(expenses)
	return &ProfitSummary{
		TotalSales:    sales,
		TotalExpenses: expenses,
		Profit:        profit,
		StartDate:     start,
		EndDate:       end,
	}
}

// IsProfit checks if the business made a profit (greater than zero)
func (ps *ProfitSummary) IsProfit() bool {
	return ps.Profit.GreaterThan(decimal.Zero)
}

// NewSalesReport creates a new SalesReport
func NewSalesReport(totalSales decimal.Decimal, totalOrders int, topProducts []TopProduct, start, end time.Time) *SalesReport {
	return &SalesReport{
		TotalSales:  totalSales,
		TotalOrders: totalOrders,
		TopProducts: topProducts,
		StartDate:   start,
		EndDate:     end,
	}
}

// NewExpenseReport creates a new ExpenseReport
func NewExpenseReport(totalExpenses decimal.Decimal, totalTransactions int, byCategory []ExpenseByCategory, start, end time.Time) *ExpenseReport {
	return &ExpenseReport{
		TotalExpenses:     totalExpenses,
		TotalTransactions: totalTransactions,
		ByCategory:        byCategory,
		StartDate:         start,
		EndDate:           end,
	}
}

// NewInventoryReport creates a new InventoryReport
func NewInventoryReport(totalProducts int, lowStock, outOfStock []InventoryItem) *InventoryReport {
	return &InventoryReport{
		TotalProducts:      totalProducts,
		LowStockProducts:   lowStock,
		OutOfStockProducts: outOfStock,
		GeneratedAt:        time.Now(),
	}
}


// ReportRepository defines the interface for report data access
type ReportRepository interface {
	GetSalesReportData(businessID primitive.ObjectID, dateRange DateRange, groupBy GroupBy) (*SalesReportData, error)
	GetExpenseReportData(businessID primitive.ObjectID, dateRange DateRange, groupBy GroupBy) (*ExpenseReportData, error)
	GetProfitReportData(businessID primitive.ObjectID, dateRange DateRange, groupBy GroupBy) (*ProfitReportData, error)
	GetInventoryReportData(businessID primitive.ObjectID) (*InventoryReportData, error)
}

// SalesReportData contains raw aggregated sales data
type SalesReportData struct {
	TotalSales  decimal.Decimal
	TotalOrders int
	TopProducts []TopProduct
	GroupedData []SalesGroup
}

// ExpenseReportData contains raw aggregated expense data
type ExpenseReportData struct {
	TotalExpenses     decimal.Decimal
	TotalTransactions int
	ByCategory        []ExpenseByCategory
	GroupedData       []ExpenseGroup
}

// ProfitReportData contains raw profit data
type ProfitReportData struct {
	TotalSales    decimal.Decimal
	TotalExpenses decimal.Decimal
	GroupedData   []ProfitGroup
}

// InventoryReportData contains raw inventory data
type InventoryReportData struct {
	TotalProducts      int
	LowStockProducts   []InventoryItem
	OutOfStockProducts []InventoryItem
}
