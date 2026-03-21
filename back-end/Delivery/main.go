package main

import (
	"context"
	"os"
	"time"

	"shop-ops/Delivery/controllers"
	"shop-ops/Delivery/routers"
	infrastructure "shop-ops/Infrastructure"
	repositories "shop-ops/Repositories"
	usecases "shop-ops/Usecases"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/mongo"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		// This is fine in production where env vars are set directly
	}

	// Initialize logger
	logger := infrastructure.NewLogger(
		os.Getenv("LOG_LEVEL"),
		os.Getenv("LOG_FILE"),
	)

	logger.Info("APP", "Starting ShopOps backend...")

	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "shopops"
	}

	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, infrastructure.NewMongoClientOptions(mongoURI))
	if err != nil {
		logger.Fatal("DB", "Failed to connect to MongoDB: %v", err)
	}
	defer func() {
		if err = client.Disconnect(context.Background()); err != nil {
			logger.Error("DB", "Error disconnecting from MongoDB: %v", err)
		}
	}()

	// Ping database
	if err = client.Ping(ctx, nil); err != nil {
		logger.Fatal("DB", "Could not ping MongoDB: %v", err)
	}
	logger.Info("DB", "Connected to MongoDB successfully")

	db := client.Database(dbName)

	// Repositories
	userRepo := repositories.NewUserRepository(db)
	businessRepo := repositories.NewBusinessRepository(db)
	expenseRepo := repositories.NewExpenseRepository(db)
	inventoryRepo := repositories.NewInventoryRepository(db)
	salesRepo := repositories.NewSalesRepository(db)
	transactionRepo := repositories.NewTransactionRepository(db)
	reportRepo := repositories.NewReportRepository(db)
	exportRepo := repositories.NewExportRepository(db)
	syncRepo := repositories.NewSyncRepository(db)

	// Services
	pwdService := infrastructure.NewPasswordService()
	jwtService := infrastructure.NewJWTService()
	exportService := infrastructure.NewExportService("tmp/exports")

	// Use Cases
	userUC := usecases.NewUserUseCases(userRepo, pwdService, jwtService)
	businessUC := usecases.NewBusinessUseCases(businessRepo)
	expenseUsecase := usecases.NewExpenseUseCases(expenseRepo)
	inventoryUC := usecases.NewInventoryUseCase(inventoryRepo, businessRepo)
	salesUC := usecases.NewSalesUseCase(salesRepo, inventoryRepo, businessRepo)
	transactionUsecase := usecases.NewTransactionUseCases(transactionRepo)
	profitUC := usecases.NewProfitUseCase(salesRepo, expenseRepo, businessRepo)
	restoreUC := usecases.NewRestoreUseCases(salesRepo, expenseRepo, inventoryRepo)
	reportUC := usecases.NewReportUsecases(reportRepo, businessRepo)
	exportUC := usecases.NewExportUsecases(exportRepo, exportService, salesRepo, inventoryRepo, expenseRepo, transactionRepo)
	syncUsecase := usecases.NewSyncUseCases(syncRepo)

	// Controllers
	authController := controllers.NewAuthController(userUC)
	userController := controllers.NewUserController(userUC)
	businessController := controllers.NewBusinessController(businessUC)
	expenseController := controllers.NewExpenseController(expenseUsecase, businessUC, logger)
	inventoryController := controllers.NewInventoryController(inventoryUC, businessUC)
	salesController := controllers.NewSalesController(salesUC, businessUC)
	transactionController := controllers.NewTransactionController(transactionUsecase, businessUC, logger)
	profitController := controllers.NewProfitController(profitUC, businessUC)
	restoreController := controllers.NewRestoreController(restoreUC, businessUC)
	reportController := controllers.NewReportController(reportUC, businessUC)
	exportController := controllers.NewExportController(exportUC, businessUC)
	syncController := controllers.NewSyncController(syncUsecase, businessUC)

	// Router
	r := routers.SetupRouter(
		authController,
		userController,
		businessController,
		jwtService,
		expenseController,
		inventoryController,
		salesController,
		transactionController,
		profitController,
		restoreController,
		reportController,
		exportController,
		syncController,
		logger,
	)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	logger.Info("APP", "Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		logger.Fatal("APP", "Failed to start server: %v", err)
	}
}
