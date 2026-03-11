package domain

// ProfitSummaryResponse holds aggregated profit metrics for a period
type ProfitSummaryResponse struct {
	TotalSales        float64 `json:"total_sales"`
	TotalExpenses     float64 `json:"total_expenses"`
	NetProfit         float64 `json:"net_profit"`
	Period            string  `json:"period,omitempty"`
}

// ProfitTrendDataPoint represents a single data point in the trends chart
type ProfitTrendDataPoint struct {
	Date          string  `json:"date"`
	TotalSales    float64 `json:"total_sales"`
	TotalExpenses float64 `json:"total_expenses"`
	NetProfit     float64 `json:"net_profit"`
}

// ProfitTrendsResponse holds an array of trend data points
type ProfitTrendsResponse struct {
	Trends []ProfitTrendDataPoint `json:"trends"`
	Period string                 `json:"period,omitempty"`
}

// ProfitCompareResponse compares two periods
type ProfitCompareResponse struct {
	Current   ProfitSummaryResponse `json:"current"`
	Previous  ProfitSummaryResponse `json:"previous"`
	ChangePct float64               `json:"change_pct"` // Percentage change in NetProfit
}

// ProfitQuery holds parameters for profit endpoints
type ProfitQuery struct {
	StartDate string `form:"start_date"`
	EndDate   string `form:"end_date"`
	Period    string `form:"period,default=daily"` // daily, weekly, monthly
}
