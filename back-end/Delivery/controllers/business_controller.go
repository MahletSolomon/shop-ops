package controllers

import (
	"net/http"

	usecases "shop-ops/Usecases"

	"github.com/gin-gonic/gin"
)

// Supported currencies: African currencies + common international ones
var supportedCurrencies = map[string]bool{
	// West Africa
	"NGN": true, // Nigeria
	"GHS": true, // Ghana
	"XOF": true, // CFA Franc BCEAO (Senegal, Ivory Coast, Mali, Burkina Faso, Niger, Togo, Benin, Guinea-Bissau)
	"SLL": true, // Sierra Leone
	"GMD": true, // Gambia
	"LRD": true, // Liberia
	"GNF": true, // Guinea
	// East Africa
	"KES": true, // Kenya
	"UGX": true, // Uganda
	"TZS": true, // Tanzania
	"RWF": true, // Rwanda
	"ETB": true, // Ethiopia
	"BIF": true, // Burundi
	"SOS": true, // Somalia
	"DJF": true, // Djibouti
	// Southern Africa
	"ZAR": true, // South Africa
	"BWP": true, // Botswana
	"ZMW": true, // Zambia
	"MWK": true, // Malawi
	"MZN": true, // Mozambique
	"NAD": true, // Namibia
	"SZL": true, // Eswatini
	"LSL": true, // Lesotho
	"ZWL": true, // Zimbabwe
	// Central Africa
	"XAF": true, // CFA Franc BEAC (Cameroon, Chad, Congo, Gabon, Equatorial Guinea, CAR)
	"CDF": true, // DR Congo
	// North Africa
	"EGP": true, // Egypt
	"MAD": true, // Morocco
	"TND": true, // Tunisia
	"DZD": true, // Algeria
	"LYD": true, // Libya
	"SDG": true, // Sudan
	// International
	"USD": true,
	"EUR": true,
	"GBP": true,
}

var supportedCurrencyList = func() []string {
	keys := make([]string, 0, len(supportedCurrencies))
	for k := range supportedCurrencies {
		keys = append(keys, k)
	}
	return keys
}()

type BusinessController struct {
	businessUseCases usecases.BusinessUseCases
}

func NewBusinessController(b usecases.BusinessUseCases) *BusinessController {
	return &BusinessController{
		businessUseCases: b,
	}
}

func (c *BusinessController) Create(ctx *gin.Context) {
	userId := ctx.GetString("user_id")
	if userId == "" {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req usecases.CreateBusinessRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "code": "VAL_001"})
		return
	}

	if req.Currency != "" {
		if !supportedCurrencies[req.Currency] {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid currency", "supported_currencies": supportedCurrencyList, "code": "VAL_001"})
			return
		}
	}

	business, err := c.businessUseCases.Create(userId, &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "code": "BUS_001"})
		return
	}

	ctx.JSON(http.StatusCreated, business)
}

func (c *BusinessController) List(ctx *gin.Context) {
	userId := ctx.GetString("user_id")
	if userId == "" {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	businesses, err := c.businessUseCases.GetByUserId(userId)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch businesses"})
		return
	}

	ctx.JSON(http.StatusOK, businesses)
}

func (c *BusinessController) GetById(ctx *gin.Context) {
	// Check auth context first
	userId := ctx.GetString("user_id")
	if userId == "" {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	businessId := ctx.Param("businessId")
	if businessId == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Business ID is required"})
		return
	}

	business, err := c.businessUseCases.GetById(businessId)
	if err != nil {
		// If error is due to invalid ID format, return 400, else 500
		// Simple check for hex error
		if len(businessId) != 24 { // MongoDB ObjectID is 24 chars hex
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Business ID format"})
			return
		}
		// Ideally we check specific error type, but for now generic 400 for bad input
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch business", "details": err.Error()})
		return
	}
	if business == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "Business not found"})
		return
	}

	// Authorization check: ensure user owns this business
	if business.UserID.Hex() != userId {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	ctx.JSON(http.StatusOK, business)
}

func (c *BusinessController) Update(ctx *gin.Context) {
	userId := ctx.GetString("user_id")
	if userId == "" {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	businessId := ctx.Param("businessId")
	var req usecases.UpdateBusinessRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if req.Currency != "" {
		if !supportedCurrencies[req.Currency] {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid currency", "supported_currencies": supportedCurrencyList, "code": "VAL_001"})
			return
		}
	}

	business, err := c.businessUseCases.Update(businessId, userId, &req)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "business not found" {
			status = http.StatusNotFound
		} else if err.Error() == "unauthorized" {
			status = http.StatusForbidden
		} else if err.Error() == "business with this name already exists" {
			status = http.StatusConflict
		}
		ctx.JSON(status, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, business)
}
