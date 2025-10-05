package handlers

import (
	"net/http"

	"lay.ai/backend/internal/models"
	"lay.ai/backend/internal/services"

	"github.com/gin-gonic/gin"
)

// AuthHandler handles authentication-related HTTP requests
type AuthHandler struct {
	authService *services.AuthService
}

// NewAuthHandler creates a new AuthHandler
func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// RegisterUserHandler handles POST /api/auth/register
func (h *AuthHandler) RegisterUserHandler(c *gin.Context) {
	var req models.RegisterRequest

	// Read and validate JSON data from request body
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	// Validate that required fields are not empty (additional validation)
	if req.Name == "" || req.Email == "" || req.Password == "" || req.Role == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "All fields (name, email, password, role) are required",
		})
		return
	}

	// Call AuthService to do the real work
	user, err := h.authService.RegisterUser(req.Name, req.Email, req.NIM, req.Password, req.Role)
	if err != nil {
		// Check if it's a duplicate email error
		if err.Error() == "failed to create user: failed to insert user: ERROR: duplicate key value violates unique constraint \"users_email_key\" (SQLSTATE 23505)" {
			c.JSON(http.StatusConflict, gin.H{
				"error": "Email already been used please use another email or try login instead",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to register user",
			"details": err.Error(),
		})
		return
	}

	// Send back successful response
	response := models.RegisterResponse{
		ID:     user.ID,
		Name:   user.Name,
		Email:  user.Email,
		NIM:    user.NIM,
		Role:   user.Role,
		Status: user.Status,
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"user":    response,
	})
}
