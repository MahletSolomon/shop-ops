package main

import (
	"context"
	"log"
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
		log.Println("No .env file found")
	}

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
		log.Fatal(err)
	}
	defer func() {
		if err = client.Disconnect(context.Background()); err != nil {
			log.Fatal(err)
		}
	}()

	// Ping database
	if err = client.Ping(ctx, nil); err != nil {
		log.Fatal("Could not connect to MongoDB:", err)
	}
	log.Println("Connected to MongoDB")

	db := client.Database(dbName)

	// Repositories
	userRepo := repositories.NewUserRepository(db)
	businessRepo := repositories.NewBusinessRepository(db)
	expenseRepo := repositories.NewExpenseRepository(db)
	inventoryRepo := repositories.NewInventoryRepository(db)
	salesRepo := repositories.NewSalesRepository(db)
	transactionRepo := repositories.NewTransactionRepository(db)
	reportRepo := repositories.NewReportRepository(db)

	// Services
	pwdService := infrastructure.NewPasswordService()
	jwtService := infrastructure.NewJWTService()

	// Use Cases
	userUC := usecases.NewUserUseCases(userRepo, pwdService, jwtService)
	businessUC := usecases.NewBusinessUseCases(businessRepo)
	expenseUsecase := usecases.NewExpenseUseCases(expenseRepo)
	inventoryUC := usecases.NewInventoryUseCase(inventoryRepo, businessRepo)
	salesUC := usecases.NewSalesUseCase(salesRepo, inventoryRepo, businessRepo)
	transactionUsecase := usecases.NewTransactionUseCases(transactionRepo)
	profitUC := usecases.NewProfitUseCase(salesRepo, expenseRepo, businessRepo)
	reportUC := usecases.NewReportUsecases(reportRepo, businessRepo)

	// Controllers
	authController := controllers.NewAuthController(userUC)
	userController := controllers.NewUserController(userUC)
	businessController := controllers.NewBusinessController(businessUC)
	expenseController := controllers.NewExpenseController(expenseUsecase, businessUC)
	inventoryController := controllers.NewInventoryController(inventoryUC, businessUC)
	salesController := controllers.NewSalesController(salesUC, businessUC)
	transactionController := controllers.NewTransactionController(transactionUsecase, businessUC)
	profitController := controllers.NewProfitController(profitUC, businessUC)
	reportController := controllers.NewReportController(reportUC, businessUC)

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
		reportController,
	)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
