package routers

import (
	"shop-ops/Delivery/controllers"
	infrastructure "shop-ops/Infrastructure"
	"time"

	"github.com/gin-contrib/cors"
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
	restoreController *controllers.RestoreController,
	reportController *controllers.ReportController,
	exportController *controllers.ExportController,
	syncController *controllers.SyncController,
	logger *infrastructure.Logger,
) *gin.Engine {
	r := gin.New()
	r.Use(infrastructure.RequestLogger(logger))
	r.Use(gin.Recovery())

	// CORS - allow all origins so any frontend can call this API
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization"}, // Updated AllowHeaders
		ExposeHeaders:    []string{"Content-Length", "Content-Disposition"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour, // Added MaxAge
	}))

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
		protected.Use(infrastructure.AuthMiddleware(jwtService, logger))
		{
			// User Routes
			userGroup := protected.Group("/users")
			{
				userGroup.GET("/me", userController.GetProfile)
				userGroup.PATCH("/me", userController.UpdateProfile)
				userGroup.PUT("/me/password", userController.ChangePassword)
				userGroup.PUT("/me/phone", userController.ChangePhone)
			}

			// Business Routes
			businessGroup := protected.Group("/businesses")
			{
				businessGroup.POST("", businessController.Create)
				businessGroup.GET("", businessController.List)
				businessGroup.GET("/:businessId", businessController.GetById)
				businessGroup.PATCH("/:businessId", businessController.Update)
			}

			// Inventory Routes
			inventoryGroup := protected.Group("/inventory/products")
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

			// Sales Routes
			salesGroup := protected.Group("/sales")
			{
				salesGroup.POST("", salesController.CreateSale)
				salesGroup.GET("", salesController.GetSales)
				salesGroup.GET("/summary", salesController.GetSalesSummary)
				salesGroup.GET("/stats", salesController.GetSalesStats)
				salesGroup.GET("/:saleId", salesController.GetSale)
				salesGroup.PATCH("/:saleId", salesController.UpdateSale)
				salesGroup.DELETE("/:saleId", salesController.VoidSale)
			}

			// Profit Routes
			profitGroup := protected.Group("/profit")
			{
				profitGroup.GET("/summary", profitController.GetSummary)
				profitGroup.GET("/trends", profitController.GetTrends)
				profitGroup.GET("/compare", profitController.GetComparison)
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

			// Restore Routes (nested under businesses)
			restoreGroup := businessGroup.Group("/:businessId/restore")
			{
				restoreGroup.GET("", restoreController.FullRestore)
				restoreGroup.GET("/incremental", restoreController.IncrementalRestore)
			}

			// Report Routes
			reportGroup := protected.Group("/reports")
			{
				reportGroup.GET("/sales", reportController.GetSalesReport)
				reportGroup.GET("/expenses", reportController.GetExpenseReport)
				reportGroup.GET("/profit", reportController.GetProfitReport)
				reportGroup.GET("/inventory", reportController.GetInventoryReport)
			}

			// Export Routes
			exportGroup := protected.Group("/export")
			{
				exportGroup.POST("", exportController.RequestExport)
				exportGroup.GET("/history", exportController.GetExportHistory)
				exportGroup.GET("/:exportId", exportController.GetExportStatus)
			}

			// Download Route (Protected)
			protected.GET("/download/:filename", exportController.DownloadExport)

			// Sync Routes (Offline-first data synchronization)
			syncGroup := protected.Group("/sync")
			{
				syncGroup.POST("/batch", syncController.SyncBatch)
				syncGroup.GET("/status", syncController.GetSyncStatus)
				syncGroup.GET("/history", syncController.GetSyncHistory)
			}

			logger.Debug("ROUTER", "All routes registered successfully")
		}
	}

	return r
}
