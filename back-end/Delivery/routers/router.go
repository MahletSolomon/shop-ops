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
) *gin.Engine {
	r := gin.Default()

	// Health check (public, sans version)
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "pong",
		})
	})

	// API v1 Group
	v1 := r.Group("/api/v1")
	{
		// Health check for v1
		v1.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		// Auth Routes (Public)
		authGroup := v1.Group("/auth")
		{
			authGroup.POST("/register", authController.Register)
			authGroup.POST("/login", authController.Login)
			authGroup.POST("/refresh", authController.RefreshToken)
		}

		// Protected Routes
		protected := v1.Group("/")
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
			log.Println("=== ROUTES SAVED ===")
			for _, route := range r.Routes() {
				log.Printf("[ROUTE] %s %s", route.Method, route.Path)
			}
		}
	}

	return r
}
