package infrastructure

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func AuthMiddleware(jwtService *JWTService, logger *Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header format must be Bearer {token}"})
			return
		}

		tokenString := parts[1]
		token, err := jwtService.ValidateToken(tokenString)
		if err != nil {
			logger.Warn("AUTH", "Token validation error: %v", err)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}
		if token == nil || !token.Valid {
			logger.Warn("AUTH", "Token is nil or not valid")
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			return
		}

		userID, ok := claims["user_id"].(string)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID in token"})
			return
		}

		// Enforce token type
		tokenType, ok := claims["type"].(string)
		if !ok || tokenType != "access" {
			logger.Warn("AUTH", "Rejected token type: %v", claims["type"])
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token type"})
			return
		}

		c.Set("user_id", userID)
		c.Next()
	}
}

// DevAuthMiddleware is a temporary middleware for local development/testing.
// It sets a fake userID in the context so endpoints that require authentication can be tested.
// TODO: Replace with real JWT auth middleware before deploying to production.
func DevAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("user_id", "000000000000000000000001")
		c.Next()
	}
}
