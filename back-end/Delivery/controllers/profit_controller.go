package controllers

import (
	"net/http"
	domain "shop-ops/Domain"
	usecases "shop-ops/Usecases"

	"github.com/gin-gonic/gin"
)

type ProfitController struct {
	profitUseCase usecases.ProfitUseCase
}

func NewProfitController(useCase usecases.ProfitUseCase) *ProfitController {
	return &ProfitController{
		profitUseCase: useCase,
	}
}

// GetSummary handles fetching profit summary for a period
func (pc *ProfitController) GetSummary(c *gin.Context) {
	businessID := c.Param("businessId")
	if businessID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "businessId is required"})
		return
	}

	var query domain.ProfitQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	summary, err := pc.profitUseCase.GetSummary(businessID, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, summary)
}

// GetTrends handles fetching profit trends over time
func (pc *ProfitController) GetTrends(c *gin.Context) {
	businessID := c.Param("businessId")
	if businessID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "businessId is required"})
		return
	}

	var query domain.ProfitQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	trends, err := pc.profitUseCase.GetTrends(businessID, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, trends)
}

// GetComparison handles comparing profit between two periods
func (pc *ProfitController) GetComparison(c *gin.Context) {
	businessID := c.Param("businessId")
	if businessID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "businessId is required"})
		return
	}

	var query domain.ProfitQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	comparison, err := pc.profitUseCase.GetComparison(businessID, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, comparison)
}
