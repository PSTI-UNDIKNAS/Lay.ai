package middleware

import (
	"net/http"

	"lay.ai/backend/internal/models"
	"lay.ai/backend/internal/services"
	"lay.ai/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware validates JWT tokens and protects routes
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header is required",
			})
			c.Abort()
			return
		}

		// Extract token from header
		token, err := utils.ExtractTokenFromHeader(authHeader)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": err.Error(),
			})
			c.Abort()
			return
		}

		// Validate token
		claims, err := utils.ValidateJWT(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// Store user information in context for use in handlers
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)

		// Continue to next handler
		c.Next()
	}
}

// OptionalAuthMiddleware validates JWT tokens but doesn't require them
// Useful for endpoints that work differently for authenticated vs anonymous users
func OptionalAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// No token provided, continue without authentication
			c.Next()
			return
		}

		// Extract token from header
		token, err := utils.ExtractTokenFromHeader(authHeader)
		if err != nil {
			// Invalid header format, continue without authentication
			c.Next()
			return
		}

		// Validate token
		claims, err := utils.ValidateJWT(token)
		if err != nil {
			// Invalid token, continue without authentication
			c.Next()
			return
		}

		// Store user information in context
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("authenticated", true)

		// Continue to next handler
		c.Next()
	}
}

// RequireRole middleware checks if the authenticated user has the required role
func RequireRole(requiredRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// This middleware should be used after AuthMiddleware
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
			})
			c.Abort()
			return
		}

		// In a real implementation, you would fetch the user's role from the database
		// For now, we'll assume the role is stored in the JWT claims
		// You can extend this by adding role to JWT claims or fetching from database
		
		// For demonstration, we'll check if the user is authenticated
		// In practice, you'd want to fetch the user's role and compare
		if userID == "" {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Insufficient permissions",
			})
			c.Abort()
			return
		}

		// Continue to next handler
		c.Next()
	}
}

// GetUserFromContext extracts user information from the Gin context
func GetUserFromContext(c *gin.Context) (userID string, email string, authenticated bool) {
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		return "", "", false
	}

	emailInterface, exists := c.Get("user_email")
	if !exists {
		return "", "", false
	}

	userID, ok := userIDInterface.(string)
	if !ok {
		return "", "", false
	}

	email, ok = emailInterface.(string)
	if !ok {
		return "", "", false
	}

	return userID, email, true
}

// AuthWithStatusMiddleware validates JWT tokens and checks user status from database
// This middleware requires an AuthService to check user status
func AuthWithStatusMiddleware(authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header is required",
			})
			c.Abort()
			return
		}

		// Extract token from header
		token, err := utils.ExtractTokenFromHeader(authHeader)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": err.Error(),
			})
			c.Abort()
			return
		}

		// Validate token
		claims, err := utils.ValidateJWT(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// Get user from database to check status
		user, err := authService.GetUserByID(claims.UserID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "User not found",
			})
			c.Abort()
			return
		}

		// Check if user is active
		if user.Status != models.StatusActive {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Account is not active. Please contact administrator for approval.",
			})
			c.Abort()
			return
		}

		// Store user information in context for use in handlers
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", string(user.Role))
		c.Set("user_status", string(user.Status))

		// Continue to next handler
		c.Next()
	}
}

// AdminOnlyMiddleware ensures only admin users can access the endpoint
func AdminOnlyMiddleware(authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// This middleware should be used after AuthWithStatusMiddleware
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
			})
			c.Abort()
			return
		}

		userIDStr, ok := userID.(string)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Invalid user ID format",
			})
			c.Abort()
			return
		}

		// Fetch user from database to check role
		user, err := authService.GetUserByID(userIDStr)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to verify user permissions",
			})
			c.Abort()
			return
		}

		// Check if user has admin role
		if user.Role != models.RoleAdmin {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Admin access required",
			})
			c.Abort()
			return
		}

		// Continue to next handler
		c.Next()
	}
}