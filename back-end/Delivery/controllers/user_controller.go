package controllers

import (
	"net/http"

	usecases "shop-ops/Usecases"

	"github.com/gin-gonic/gin"
)

type UserController struct {
	userUseCases usecases.UserUseCases
}

func NewUserController(u usecases.UserUseCases) *UserController {
	return &UserController{
		userUseCases: u,
	}
}

func (c *UserController) GetProfile(ctx *gin.Context) {
	userId := ctx.GetString("user_id") // Set by AuthMiddleware
	if userId == "" {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	user, err := c.userUseCases.GetProfile(userId)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch profile"})
		return
	}
	if user == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	ctx.JSON(http.StatusOK, user)
}

func (c *UserController) UpdateProfile(ctx *gin.Context) {
	userId := ctx.GetString("user_id")
	if userId == "" {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req usecases.UpdateProfileRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	user, err := c.userUseCases.UpdateProfile(userId, &req)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "user not found" {
			status = http.StatusNotFound
		} else if err.Error() == "user with this email already exists" {
			status = http.StatusConflict
		}
		ctx.JSON(status, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, user)
}
