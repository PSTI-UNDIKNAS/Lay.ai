package handlers

import (
	"net/http"

	"lay.ai/backend/internal/middleware"
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
    if req.Name == "" || req.Email == "" || req.Password == "" || req.Role == "" || req.UniqueIdentifier == "" {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": "All fields (name, email, unique_identifier, password, role) are required",
        })
        return
    }

    // Security check: Prevent admin registration through public API
    if req.Role == models.RoleAdmin {
        c.JSON(http.StatusForbidden, gin.H{
            "error": "Admin registration is not allowed through public API. Contact system administrator.",
        })
        return
    }

	// Call AuthService to do the real work
	user, err := h.authService.RegisterUser(req.Name, req.Email, req.UniqueIdentifier, req.Password, req.Role)
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
		ID:               user.ID,
		Name:             user.Name,
		Email:            user.Email,
		UniqueIdentifier: user.UniqueIdentifier,
		Role:             user.Role,
		Status:           user.Status,
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"user":    response,
	})
}

// LoginUserHandler handles POST /api/auth/login
func (h *AuthHandler) LoginUserHandler(c *gin.Context) {
	var req models.LoginRequest

	// Read and validate JSON data from request body
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	// Additional validation for required fields
	if req.Email == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Email and password are required",
		})
		return
	}

	// Call AuthService to authenticate user
	loginResponse, err := h.authService.LoginUser(req.Email, req.Password)
	if err != nil {
		// Return generic error message for security (don't reveal if email exists)
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid email or password",
		})
		return
	}

	// Send back successful response with token and user info
	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"token":   loginResponse.Token,
		"user": gin.H{
			"id":                loginResponse.User.ID,
			"name":              loginResponse.User.Name,
			"email":             loginResponse.User.Email,
			"unique_identifier": loginResponse.User.UniqueIdentifier,
			"role":              loginResponse.User.Role,
			"status":            loginResponse.User.Status,
		},
	})
}

// GetMeHandler handles GET /api/auth/me
func (h *AuthHandler) GetMeHandler(c *gin.Context) {
	// Extract user information from context (set by AuthMiddleware)
	userID, _, authenticated := middleware.GetUserFromContext(c)
	if !authenticated {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
		})
		return
	}

	// Get user details from the service
	user, err := h.authService.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get user information",
		})
		return
	}

	// Return user information
	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":                user.ID,
			"name":              user.Name,
			"email":             user.Email,
			"unique_identifier": user.UniqueIdentifier,
			"role":              user.Role,
			"status":            user.Status,
		},
	})
}

// LogoutHandler handles POST /api/auth/logout
func (h *AuthHandler) LogoutHandler(c *gin.Context) {
	// Extract user information from context (set by AuthMiddleware)
	userID, _, authenticated := middleware.GetUserFromContext(c)
	if !authenticated {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
		})
		return
	}

	// In a stateless JWT implementation, logout is typically handled client-side
	// by removing the token from storage. However, we can log the logout event
	// or implement token blacklisting if needed in the future.
	
	// For now, we'll just return a success response
	c.JSON(http.StatusOK, gin.H{
		"message": "Logout successful",
		"user_id": userID,
	})
}
