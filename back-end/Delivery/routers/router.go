package routers

import (
	"log"
	"shop-ops/Delivery/controllers"
	infrastructure "shop-ops/Infrastructure"

	"github.com/gin-gonic/gin"
)

func SetupRouter(
	authController *controllers.AuthController,
	userController *controllers.UserController,
	businessController *controllers.BusinessController,
	jwtService *infrastructure.JWTService,
	expenseController *controllers.ExpenseController,
	inventoryController *controllers.InventoryController,
	salesController *controllers.SalesController,
	transactionController *controllers.TransactionController,
	profitController *controllers.ProfitController,
) *gin.Engine {
	r := gin.Default()

	// Health check (public, sans version)
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	// API Group
	api := r.Group("/")
	{
		// Health check
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		// Auth Routes (Public)
		authGroup := api.Group("/auth")
		{
			authGroup.POST("/register", authController.Register)
			authGroup.POST("/login", authController.Login)
			authGroup.POST("/refresh", authController.RefreshToken)
		}

		// Protected Routes
		protected := api.Group("/")
		protected.Use(infrastructure.AuthMiddleware(jwtService))
		{
			// User Routes
			userGroup := protected.Group("/users")
			{
				userGroup.GET("/me", userController.GetProfile)
				userGroup.PATCH("/me", userController.UpdateProfile)
			}

			// Business Routes
			businessGroup := protected.Group("/businesses")
			{
				businessGroup.POST("", businessController.Create)
				businessGroup.GET("", businessController.List)
				businessGroup.GET("/:businessId", businessController.GetById)
				businessGroup.PATCH("/:businessId", businessController.Update)

				// Inventory Routes (nested under business)
				inventoryGroup := businessGroup.Group("/:businessId/inventory/products")
				{
					inventoryGroup.POST("", inventoryController.CreateProduct)
					inventoryGroup.GET("", inventoryController.GetProducts)
					inventoryGroup.GET("/low-stock", inventoryController.GetLowStock)
					inventoryGroup.GET("/:productId", inventoryController.GetProduct)
					inventoryGroup.PATCH("/:productId", inventoryController.UpdateProduct)
					inventoryGroup.DELETE("/:productId", inventoryController.DeleteProduct)
					inventoryGroup.POST("/:productId/adjust", inventoryController.AdjustStock)
					inventoryGroup.GET("/:productId/history", inventoryController.GetStockHistory)
				}

				// Sales Routes (nested under business)
				salesGroup := businessGroup.Group("/:businessId/sales")
				{
					salesGroup.POST("", salesController.CreateSale)
					salesGroup.GET("", salesController.GetSales)
					salesGroup.GET("/summary", salesController.GetSalesSummary)
					salesGroup.GET("/stats", salesController.GetSalesStats)
					salesGroup.GET("/:saleId", salesController.GetSale)
					salesGroup.PATCH("/:saleId", salesController.UpdateSale)
					salesGroup.DELETE("/:saleId", salesController.VoidSale)
				}

				// Profit Routes (nested under business)
				profitGroup := businessGroup.Group("/:businessId/profit")
				{
					profitGroup.GET("/summary", profitController.GetSummary)
					profitGroup.GET("/trends", profitController.GetTrends)
					profitGroup.GET("/compare", profitController.GetComparison)
				}
			}

			// Expense Routes
			expenseGroup := protected.Group("/expenses")
			{
				expenseGroup.POST("", expenseController.RecordExpense)
				expenseGroup.GET("/", expenseController.GetExpenses)
				expenseGroup.GET("/categories", expenseController.GetCategories)
				expenseGroup.GET("/summary", expenseController.GetSummary)
				expenseGroup.GET("/:expenseId", expenseController.GetExpenseById)
				expenseGroup.PATCH("/:expenseId", expenseController.UpdateExpense)
				expenseGroup.DELETE("/:expenseId", expenseController.VoidExpense)
			}

			// Transaction Routes (Data Explorer - Unified View)
			transactionGroup := protected.Group("/transactions")
			{
				transactionGroup.GET("", transactionController.GetTransactions)
			}

			log.Println("=== ROUTES SAVED ===")
			for _, route := range r.Routes() {
				log.Printf("[ROUTE] %s %s", route.Method, route.Path)
			}
		}
	}

	return r
}
