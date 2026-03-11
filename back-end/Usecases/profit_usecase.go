package usecases

import (
	"context"
	"fmt"
	"math"
	"time"

	domain "shop-ops/Domain"
	repositories "shop-ops/Repositories"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ProfitUseCase interface {
	GetSummary(businessID string, query domain.ProfitQuery) (*domain.ProfitSummaryResponse, error)
	GetTrends(businessID string, query domain.ProfitQuery) (*domain.ProfitTrendsResponse, error)
	GetComparison(businessID string, query domain.ProfitQuery) (*domain.ProfitCompareResponse, error)
}

type profitUseCase struct {
	salesRepo    domain.SaleRepository
	expenseRepo  repositories.ExpenseRepository
	businessRepo domain.BusinessRepository
}

func NewProfitUseCase(
	salesRepo domain.SaleRepository,
	expenseRepo repositories.ExpenseRepository,
	businessRepo domain.BusinessRepository,
) ProfitUseCase {
	return &profitUseCase{
		salesRepo:    salesRepo,
		expenseRepo:  expenseRepo,
		businessRepo: businessRepo,
	}
}

// Helper to parse dates with defaults
func parseDateRange(startStr, endStr string, defaultDays int) (time.Time, time.Time, error) {
	var start, end time.Time
	var err error

	if startStr != "" {
		start, err = time.Parse("2006-01-02", startStr)
		if err != nil {
			return start, end, fmt.Errorf("invalid start_date format (use YYYY-MM-DD): %w", err)
		}
	} else {
		start = time.Now().AddDate(0, 0, -defaultDays)
	}

	if endStr != "" {
		end, err = time.Parse("2006-01-02", endStr)
		if err != nil {
			return start, end, fmt.Errorf("invalid end_date format (use YYYY-MM-DD): %w", err)
		}
		// include the full end day
		end = end.Add(24*time.Hour - time.Second)
	} else {
		end = time.Now()
	}

	return start, end, nil
}

func (uc *profitUseCase) getSummaryForPeriod(businessID string, start, end time.Time) (*domain.ProfitSummaryResponse, error) {
	// 1. Get Sales Summary
	salesSummary, err := uc.salesRepo.GetSummary(businessID, start, end)
	if err != nil {
		return nil, fmt.Errorf("failed to get sales summary: %w", err)
	}

	// 2. Get Expenses Summary
	importCtx := context.TODO() // or require context in interface
	fromHex, err := primitive.ObjectIDFromHex(businessID)
	if err != nil {
		return nil, fmt.Errorf("invalid business ID: %w", err)
	}
	
	_, grandTotalDecimal, err := uc.expenseRepo.GetSummaryByCategory(importCtx, fromHex, &start, &end)
	if err != nil {
		return nil, fmt.Errorf("failed to get expense summary: %w", err)
	}
	
	grandTotalExpenses, _ := grandTotalDecimal.Float64()

	// 3. Calculate Net Profit
	netProfit := salesSummary.TotalRevenue - grandTotalExpenses

	return &domain.ProfitSummaryResponse{
		TotalSales:    math.Round(salesSummary.TotalRevenue*100) / 100,
		TotalExpenses: math.Round(grandTotalExpenses*100) / 100,
		NetProfit:     math.Round(netProfit*100) / 100,
		Period:        fmt.Sprintf("%s to %s", start.Format("2006-01-02"), end.Format("2006-01-02")),
	}, nil
}

func (uc *profitUseCase) GetSummary(businessID string, query domain.ProfitQuery) (*domain.ProfitSummaryResponse, error) {
	start, end, err := parseDateRange(query.StartDate, query.EndDate, 30) // Default 30 days
	if err != nil {
		return nil, err
	}
	return uc.getSummaryForPeriod(businessID, start, end)
}

func (uc *profitUseCase) GetTrends(businessID string, query domain.ProfitQuery) (*domain.ProfitTrendsResponse, error) {
	start, end, err := parseDateRange(query.StartDate, query.EndDate, 30) // Default 30 days
	if err != nil {
		return nil, err
	}

	period := query.Period
	if period == "" {
		period = "daily"
	}

	var trends []domain.ProfitTrendDataPoint

	current := start
	for current.Before(end) || current.Equal(end) {
		var next time.Time
		var dateLabel string

		switch period {
		case "daily":
			next = current.Add(24 * time.Hour)
			dateLabel = current.Format("2006-01-02")
		case "weekly":
			next = current.AddDate(0, 0, 7)
			// Truncate next to end of week or overall end date
			if next.After(end) {
				next = end.Add(time.Second) // loop termination logic
			}
			dateLabel = fmt.Sprintf("%s to %s", current.Format("01-02"), next.Add(-time.Second).Format("01-02"))
		case "monthly":
			next = current.AddDate(0, 1, 0)
			// Ensure next starts at day 1 of next month
			next = time.Date(next.Year(), next.Month(), 1, 0, 0, 0, 0, next.Location())
			if next.After(end) {
				next = end.Add(time.Second) // loop termination
			}
			dateLabel = current.Format("2006-01")
		default:
			return nil, fmt.Errorf("invalid period type: %s", period)
		}

		// Ensure we don't query past the requested end date
		queryEnd := next.Add(-time.Second)
		if queryEnd.After(end) {
			queryEnd = end
		}

		summary, err := uc.getSummaryForPeriod(businessID, current, queryEnd)
		if err != nil {
			return nil, err
		}

		trends = append(trends, domain.ProfitTrendDataPoint{
			Date:          dateLabel,
			TotalSales:    summary.TotalSales,
			TotalExpenses: summary.TotalExpenses,
			NetProfit:     summary.NetProfit,
		})

		current = next
	}

	return &domain.ProfitTrendsResponse{
		Trends: trends,
		Period: fmt.Sprintf("%s to %s (%s)", start.Format("2006-01-02"), end.Format("2006-01-02"), period),
	}, nil
}

func (uc *profitUseCase) GetComparison(businessID string, query domain.ProfitQuery) (*domain.ProfitCompareResponse, error) {
	currentStart, currentEnd, err := parseDateRange(query.StartDate, query.EndDate, 30)
	if err != nil {
		return nil, err
	}

	// Calculate duration of current period
	duration := currentEnd.Sub(currentStart)
	
	// Previous period is exactly the same duration, ending right before current starts
	prevEnd := currentStart.Add(-time.Second)
	prevStart := prevEnd.Add(-duration)

	currentSummary, err := uc.getSummaryForPeriod(businessID, currentStart, currentEnd)
	if err != nil {
		return nil, err
	}

	prevSummary, err := uc.getSummaryForPeriod(businessID, prevStart, prevEnd)
	if err != nil {
		return nil, err
	}

	var changePct float64
	if prevSummary.NetProfit != 0 {
		changePct = ((currentSummary.NetProfit - prevSummary.NetProfit) / math.Abs(prevSummary.NetProfit)) * 100
	} else if currentSummary.NetProfit > 0 {
		changePct = 100 // From zero to positive
	} else if currentSummary.NetProfit < 0 {
		changePct = -100 // From zero to negative
	}

	return &domain.ProfitCompareResponse{
		Current:   *currentSummary,
		Previous:  *prevSummary,
		ChangePct: math.Round(changePct*100) / 100,
	}, nil
}
