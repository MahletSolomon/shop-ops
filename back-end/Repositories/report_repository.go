package repositories

import (
	"context"
	"fmt"
	"time"

	Domain "shop-ops/Domain"

	"github.com/shopspring/decimal"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// ReportRepository handles data access for reports
type ReportRepository struct {
	salesCollection    *mongo.Collection
	expensesCollection *mongo.Collection
	productsCollection *mongo.Collection
}

// NewReportRepository creates a new ReportRepository
func NewReportRepository(db *mongo.Database) Domain.ReportRepository {
	return &ReportRepository{
		salesCollection:    db.Collection("sales"),
		expensesCollection: db.Collection("expenses"),
		productsCollection: db.Collection("products"),
	}
}

// GetSalesReportData aggregates sales data for reports
func (r *ReportRepository) GetSalesReportData(businessID primitive.ObjectID, dateRange Domain.DateRange, groupBy Domain.GroupBy) (*Domain.SalesReportData, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	matchStage := bson.M{
		"business_id": businessID,
		"created_at": bson.M{
			"$gte": dateRange.From,
			"$lte": dateRange.To,
		},
		"is_voided": bson.M{"$ne": true},
	}

	// Aggregate total sales and orders
	totalPipeline := mongo.Pipeline{
		{{"$match", matchStage}},
		{{"$group", bson.M{
			"_id":          nil,
			"total_sales":  bson.M{"$sum": "$total"},
			"total_orders": bson.M{"$sum": 1},
		}}},
	}

	cursor, err := r.salesCollection.Aggregate(ctx, totalPipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate sales totals: %w", err)
	}
	defer cursor.Close(ctx)

	var totalResult struct {
		TotalSales  float64 `bson:"total_sales"`
		TotalOrders int     `bson:"total_orders"`
	}
	if cursor.Next(ctx) {
		if err := cursor.Decode(&totalResult); err != nil {
			return nil, fmt.Errorf("failed to decode sales totals: %w", err)
		}
	}

	// Aggregate top products
	topProductsPipeline := mongo.Pipeline{
		{{"$match", matchStage}},
		{{"$group", bson.M{
			"_id":          "$product_id",
			"product_name": bson.M{"$first": "$product_name"}, // Assuming product_name is stored
			"total_sales":  bson.M{"$sum": "$total"},
			"quantity":     bson.M{"$sum": "$quantity"},
		}}},
		{{"$sort", bson.M{"total_sales": -1}}},
		{{"$limit", 10}},
	}

	cursor, err = r.salesCollection.Aggregate(ctx, topProductsPipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate top products: %w", err)
	}
	defer cursor.Close(ctx)

	var topProducts []Domain.TopProduct
	for cursor.Next(ctx) {
		var result struct {
			ProductID   *primitive.ObjectID `bson:"_id"`
			ProductName string              `bson:"product_name"`
			TotalSales  float64             `bson:"total_sales"`
			Quantity    int                 `bson:"quantity"`
		}
		if err := cursor.Decode(&result); err != nil {
			return nil, fmt.Errorf("failed to decode top product: %w", err)
		}
		topProducts = append(topProducts, Domain.TopProduct{
			ProductID:   result.ProductID,
			ProductName: result.ProductName,
			TotalSales:  decimal.NewFromFloat(result.TotalSales),
			Quantity:    result.Quantity,
		})
	}

	// Grouped data if groupBy is specified
	var groupedData []Domain.SalesGroup
	if groupBy != "" {
		groupedPipeline := r.buildGroupedPipeline(matchStage, string(groupBy), "sales")
		cursor, err = r.salesCollection.Aggregate(ctx, groupedPipeline)
		if err != nil {
			return nil, fmt.Errorf("failed to aggregate grouped sales: %w", err)
		}
		defer cursor.Close(ctx)

		for cursor.Next(ctx) {
			var result struct {
				Period     string  `bson:"_id"`
				TotalSales float64 `bson:"total_sales"`
				Orders     int     `bson:"orders"`
			}
			if err := cursor.Decode(&result); err != nil {
				return nil, fmt.Errorf("failed to decode grouped sales: %w", err)
			}
			groupedData = append(groupedData, Domain.SalesGroup{
				Period:     result.Period,
				TotalSales: decimal.NewFromFloat(result.TotalSales),
				Orders:     result.Orders,
			})
		}
	}

	return &Domain.SalesReportData{
		TotalSales:  decimal.NewFromFloat(totalResult.TotalSales),
		TotalOrders: totalResult.TotalOrders,
		TopProducts: topProducts,
		GroupedData: groupedData,
	}, nil
}

// GetExpenseReportData aggregates expense data for reports
func (r *ReportRepository) GetExpenseReportData(businessID primitive.ObjectID, dateRange Domain.DateRange, groupBy Domain.GroupBy) (*Domain.ExpenseReportData, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	matchStage := bson.M{
		"business_id": businessID,
		"created_at": bson.M{
			"$gte": dateRange.From,
			"$lte": dateRange.To,
		},
		"is_voided": bson.M{"$ne": true},
	}

	// Aggregate totals
	totalPipeline := mongo.Pipeline{
		{{"$match", matchStage}},
		{{"$group", bson.M{
			"_id":                nil,
			"total_expenses":     bson.M{"$sum": "$amount"},
			"total_transactions": bson.M{"$sum": 1},
		}}},
	}

	cursor, err := r.expensesCollection.Aggregate(ctx, totalPipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate expense totals: %w", err)
	}
	defer cursor.Close(ctx)

	var totalResult struct {
		TotalExpenses     decimal.Decimal `bson:"total_expenses"`
		TotalTransactions int             `bson:"total_transactions"`
	}
	if cursor.Next(ctx) {
		if err := cursor.Decode(&totalResult); err != nil {
			return nil, fmt.Errorf("failed to decode expense totals: %w", err)
		}
	}

	// By category
	categoryPipeline := mongo.Pipeline{
		{{"$match", matchStage}},
		{{"$group", bson.M{
			"_id":               "$category",
			"total_amount":      bson.M{"$sum": "$amount"},
			"transaction_count": bson.M{"$sum": 1},
		}}},
		{{"$sort", bson.M{"total_amount": -1}}},
	}

	cursor, err = r.expensesCollection.Aggregate(ctx, categoryPipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate expenses by category: %w", err)
	}
	defer cursor.Close(ctx)

	var byCategory []Domain.ExpenseByCategory
	for cursor.Next(ctx) {
		var result struct {
			Category         string          `bson:"_id"`
			TotalAmount      decimal.Decimal `bson:"total_amount"`
			TransactionCount int             `bson:"transaction_count"`
		}
		if err := cursor.Decode(&result); err != nil {
			return nil, fmt.Errorf("failed to decode category expense: %w", err)
		}
		byCategory = append(byCategory, Domain.ExpenseByCategory{
			Category:         result.Category,
			TotalAmount:      result.TotalAmount,
			TransactionCount: result.TransactionCount,
		})
	}

	// Grouped data
	var groupedData []Domain.ExpenseGroup
	if groupBy != "" {
		groupedPipeline := r.buildGroupedPipeline(matchStage, string(groupBy), "expenses")
		cursor, err = r.expensesCollection.Aggregate(ctx, groupedPipeline)
		if err != nil {
			return nil, fmt.Errorf("failed to aggregate grouped expenses: %w", err)
		}
		defer cursor.Close(ctx)

		for cursor.Next(ctx) {
			var result struct {
				Period      string          `bson:"_id"`
				TotalAmount decimal.Decimal `bson:"total_amount"`
				Count       int             `bson:"count"`
			}
			if err := cursor.Decode(&result); err != nil {
				return nil, fmt.Errorf("failed to decode grouped expense: %w", err)
			}
			groupedData = append(groupedData, Domain.ExpenseGroup{
				Period:      result.Period,
				TotalAmount: result.TotalAmount,
				Count:       result.Count,
			})
		}
	}

	return &Domain.ExpenseReportData{
		TotalExpenses:     totalResult.TotalExpenses,
		TotalTransactions: totalResult.TotalTransactions,
		ByCategory:        byCategory,
		GroupedData:       groupedData,
	}, nil
}

// GetProfitReportData aggregates profit data
func (r *ReportRepository) GetProfitReportData(businessID primitive.ObjectID, dateRange Domain.DateRange, groupBy Domain.GroupBy) (*Domain.ProfitReportData, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Get sales total
	salesMatch := bson.M{
		"business_id": businessID,
		"created_at": bson.M{
			"$gte": dateRange.From,
			"$lte": dateRange.To,
		},
		"is_voided": bson.M{"$ne": true},
	}
	salesPipeline := mongo.Pipeline{
		{{"$match", salesMatch}},
		{{"$group", bson.M{
			"_id":         nil,
			"total_sales": bson.M{"$sum": "$total"},
		}}},
	}
	cursor, err := r.salesCollection.Aggregate(ctx, salesPipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate sales for profit: %w", err)
	}
	var salesTotal float64
	if cursor.Next(ctx) {
		var result struct {
			TotalSales float64 `bson:"total_sales"`
		}
		if err := cursor.Decode(&result); err != nil {
			return nil, fmt.Errorf("failed to decode sales total: %w", err)
		}
		salesTotal = result.TotalSales
	}
	cursor.Close(ctx)

	// Get expenses total
	expensesMatch := bson.M{
		"business_id": businessID,
		"created_at": bson.M{
			"$gte": dateRange.From,
			"$lte": dateRange.To,
		},
		"is_voided": bson.M{"$ne": true},
	}
	expensesPipeline := mongo.Pipeline{
		{{"$match", expensesMatch}},
		{{"$group", bson.M{
			"_id":            nil,
			"total_expenses": bson.M{"$sum": "$amount"},
		}}},
	}
	cursor, err = r.expensesCollection.Aggregate(ctx, expensesPipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate expenses for profit: %w", err)
	}
	var expensesTotal decimal.Decimal
	if cursor.Next(ctx) {
		var result struct {
			TotalExpenses decimal.Decimal `bson:"total_expenses"`
		}
		if err := cursor.Decode(&result); err != nil {
			return nil, fmt.Errorf("failed to decode expenses total: %w", err)
		}
		expensesTotal = result.TotalExpenses
	}
	cursor.Close(ctx)

	// Grouped data if needed
	var groupedData []Domain.ProfitGroup
	if groupBy != "" {
		// This would require more complex aggregation, for now skip
		// Could implement by grouping sales and expenses separately then combining
	}

	return &Domain.ProfitReportData{
		TotalSales:    decimal.NewFromFloat(salesTotal),
		TotalExpenses: expensesTotal,
		GroupedData:   groupedData,
	}, nil
}

// GetInventoryReportData gets inventory status
func (r *ReportRepository) GetInventoryReportData(businessID primitive.ObjectID) (*Domain.InventoryReportData, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pipeline := mongo.Pipeline{
		{{"$match", bson.M{"business_id": businessID}}},
		{{"$project", bson.M{
			"_id":                 1,
			"name":                1,
			"stock_quantity":      1,
			"low_stock_threshold": 1,
			"is_low_stock":        bson.M{"$lt": bson.A{"$stock_quantity", "$low_stock_threshold"}},
		}}},
	}

	cursor, err := r.productsCollection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate inventory: %w", err)
	}
	defer cursor.Close(ctx)

	var lowStock []Domain.InventoryItem
	var outOfStock []Domain.InventoryItem
	totalProducts := 0

	for cursor.Next(ctx) {
		var result struct {
			ID                primitive.ObjectID `bson:"_id"`
			Name              string             `bson:"name"`
			StockQuantity     int                `bson:"stock_quantity"`
			LowStockThreshold int                `bson:"low_stock_threshold"`
			IsLowStock        bool               `bson:"is_low_stock"`
		}
		if err := cursor.Decode(&result); err != nil {
			return nil, fmt.Errorf("failed to decode inventory item: %w", err)
		}
		totalProducts++
		item := Domain.InventoryItem{
			ProductID:         result.ID,
			ProductName:       result.Name,
			CurrentStock:      result.StockQuantity,
			LowStockThreshold: result.LowStockThreshold,
			IsLowStock:        result.IsLowStock,
		}
		if result.StockQuantity == 0 {
			outOfStock = append(outOfStock, item)
		} else if result.IsLowStock {
			lowStock = append(lowStock, item)
		}
	}

	return &Domain.InventoryReportData{
		TotalProducts:      totalProducts,
		LowStockProducts:   lowStock,
		OutOfStockProducts: outOfStock,
	}, nil
}

// buildGroupedPipeline builds aggregation pipeline for grouping by time period
func (r *ReportRepository) buildGroupedPipeline(matchStage bson.M, groupBy, collectionType string) mongo.Pipeline {
	var dateFormat string
	switch groupBy {
	case "day":
		dateFormat = "%Y-%m-%d"
	case "week":
		dateFormat = "%Y-%U"
	case "month":
		dateFormat = "%Y-%m"
	default:
		dateFormat = "%Y-%m-%d"
	}

	groupID := bson.M{"$dateToString": bson.M{"format": dateFormat, "date": "$created_at"}}

	var sumField, amountFieldName, countFieldName string
	if collectionType == "sales" {
		sumField = "$total"
		amountFieldName = "total_sales"
		countFieldName = "orders"
	} else {
		sumField = "$amount"
		amountFieldName = "total_amount"
		countFieldName = "count"
	}

	return mongo.Pipeline{
		{{"$match", matchStage}},
		{{"$group", bson.M{
			"_id":           groupID,
			amountFieldName: bson.M{"$sum": sumField},
			countFieldName:  bson.M{"$sum": 1},
		}}},
		{{"$sort", bson.M{"_id": 1}}},
	}
}
