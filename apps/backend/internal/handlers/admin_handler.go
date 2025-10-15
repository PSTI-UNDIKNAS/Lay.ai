package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"lay.ai/backend/internal/models"
	"lay.ai/backend/internal/services"
)

type AdminHandler struct {
	adminService *services.AdminService
}

func NewAdminHandler(adminService *services.AdminService) *AdminHandler {
	return &AdminHandler{
		adminService: adminService,
	}
}

// GetPendingLecturersResponse represents the response for getting pending lecturers
type GetPendingLecturersResponse struct {
	Lecturers []LecturerInfo `json:"lecturers"`
	Count     int            `json:"count"`
}

// LecturerInfo represents lecturer information for admin view
type LecturerInfo struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	Email            string `json:"email"`
	UniqueIdentifier string `json:"unique_identifier"`
	CreatedAt        string `json:"created_at"`
}

// ApproveLecturerResponse represents the response for approving a lecturer
type ApproveLecturerResponse struct {
	Message string `json:"message"`
	Success bool   `json:"success"`
}

// GetPendingLecturers handles GET /api/admin/lecturers?status=pending_approval
func (h *AdminHandler) GetPendingLecturers(c *gin.Context) {
	// Check if status query parameter is provided and equals "pending_approval"
	status := c.Query("status")
	if status != "pending_approval" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "status parameter must be 'pending_approval'",
		})
		return
	}

	lecturers, err := h.adminService.GetPendingLecturers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve pending lecturers",
		})
		return
	}

	// Convert to response format
	lecturerInfos := make([]LecturerInfo, len(lecturers))
	for i, lecturer := range lecturers {
		lecturerInfos[i] = LecturerInfo{
			ID:               lecturer.ID.String(),
			Name:             lecturer.Name,
			Email:            lecturer.Email,
			UniqueIdentifier: lecturer.UniqueIdentifier,
			CreatedAt:        lecturer.CreatedAt.Format("2006-01-02T15:04:05Z"),
		}
	}

	response := GetPendingLecturersResponse{
		Lecturers: lecturerInfos,
		Count:     len(lecturerInfos),
	}

	c.JSON(http.StatusOK, response)
}

// ApproveLecturer handles POST /api/admin/lecturers/{lecturerId}/approve
func (h *AdminHandler) ApproveLecturer(c *gin.Context) {
	lecturerID := c.Param("lecturerId")
	if lecturerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "lecturer ID is required",
		})
		return
	}

	err := h.adminService.ApproveLecturer(lecturerID)
	if err != nil {
		// Check for specific error types
		switch err.Error() {
		case "user is not a lecturer":
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "User is not a lecturer",
			})
			return
		case "lecturer is not in pending approval status":
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Lecturer is not in pending approval status",
			})
			return
		default:
			if err.Error() == "failed to get user: user not found" {
				c.JSON(http.StatusNotFound, gin.H{
					"error": "Lecturer not found",
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to approve lecturer",
			})
			return
		}
	}

	response := ApproveLecturerResponse{
		Message: "Lecturer approved successfully",
		Success: true,
	}

	c.JSON(http.StatusOK, response)
}

// Request/Response types for user management

// CreateUserRequest represents the request payload for creating a user
type CreateUserRequest struct {
	Name             string             `json:"name" binding:"required"`
	Email            string             `json:"email" binding:"required,email"`
	UniqueIdentifier string             `json:"unique_identifier" binding:"required"`
	Password         string             `json:"password" binding:"required,min=8"`
	Role             models.UserRole    `json:"role" binding:"required"`
	Status           models.UserStatus  `json:"status" binding:"required"`
}

// UpdateUserRequest represents the request payload for updating a user
type UpdateUserRequest struct {
	Name             *string            `json:"name,omitempty"`
	Email            *string            `json:"email,omitempty"`
	UniqueIdentifier *string            `json:"unique_identifier,omitempty"`
	Role             *models.UserRole   `json:"role,omitempty"`
	Status           *models.UserStatus `json:"status,omitempty"`
}

// UserResponse represents a user in API responses
type UserResponse struct {
	ID               string             `json:"id"`
	Name             string             `json:"name"`
	Email            string             `json:"email"`
	UniqueIdentifier string             `json:"unique_identifier"`
	Role             models.UserRole    `json:"role"`
	Status           models.UserStatus  `json:"status"`
	CreatedAt        string             `json:"created_at"`
	UpdatedAt        string             `json:"updated_at"`
}

// GetUsersResponse represents the response for getting users
type GetUsersResponse struct {
	Users  []UserResponse `json:"users"`
	Count  int            `json:"count"`
	Limit  int            `json:"limit"`
	Offset int            `json:"offset"`
}

// GetUsers handles GET /api/admin/users
func (h *AdminHandler) GetUsers(c *gin.Context) {
	// Parse query parameters
	roleParam := c.Query("role")
	statusParam := c.Query("status")
	limitParam := c.DefaultQuery("limit", "50")
	offsetParam := c.DefaultQuery("offset", "0")

	// Parse limit and offset
	limit, err := strconv.Atoi(limitParam)
	if err != nil || limit < 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid limit parameter",
		})
		return
	}

	offset, err := strconv.Atoi(offsetParam)
	if err != nil || offset < 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid offset parameter",
		})
		return
	}

	// Parse role filter
	var roleFilter *models.UserRole
	if roleParam != "" {
		role := models.UserRole(roleParam)
		if role != models.RoleStudent && role != models.RoleLecturer && role != models.RoleAdmin {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid role parameter. Must be 'student', 'lecturer', or 'admin'",
			})
			return
		}
		roleFilter = &role
	}

	// Parse status filter
	var statusFilter *models.UserStatus
	if statusParam != "" {
		status := models.UserStatus(statusParam)
		if status != models.StatusActive && status != models.StatusPendingApproval && status != models.StatusInactive {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid status parameter. Must be 'active', 'pending_approval', or 'inactive'",
			})
			return
		}
		statusFilter = &status
	}

	// Get users from service
	users, err := h.adminService.GetUsers(roleFilter, statusFilter, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve users",
		})
		return
	}

	// Convert to response format
	userResponses := make([]UserResponse, len(users))
	for i, user := range users {
		userResponses[i] = UserResponse{
			ID:               user.ID.String(),
			Name:             user.Name,
			Email:            user.Email,
			UniqueIdentifier: user.UniqueIdentifier,
			Role:             user.Role,
			Status:           user.Status,
			CreatedAt:        user.CreatedAt.Format("2006-01-02T15:04:05Z"),
			UpdatedAt:        user.UpdatedAt.Format("2006-01-02T15:04:05Z"),
		}
	}

	response := GetUsersResponse{
		Users:  userResponses,
		Count:  len(userResponses),
		Limit:  limit,
		Offset: offset,
	}

	c.JSON(http.StatusOK, response)
}

// GetUserByID handles GET /api/admin/users/{userId}
func (h *AdminHandler) GetUserByID(c *gin.Context) {
	userID := c.Param("userId")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User ID is required",
		})
		return
	}

	user, err := h.adminService.GetUserByID(userID)
	if err != nil {
		if err.Error() == "failed to get user: user not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "User not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve user",
		})
		return
	}

	response := UserResponse{
		ID:               user.ID.String(),
		Name:             user.Name,
		Email:            user.Email,
		UniqueIdentifier: user.UniqueIdentifier,
		Role:             user.Role,
		Status:           user.Status,
		CreatedAt:        user.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:        user.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}

	c.JSON(http.StatusOK, response)
}

// CreateUser handles POST /api/admin/users
func (h *AdminHandler) CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request payload",
			"details": err.Error(),
		})
		return
	}

	// Validate role
	if req.Role != models.RoleStudent && req.Role != models.RoleLecturer && req.Role != models.RoleAdmin {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid role. Must be 'student', 'lecturer', or 'admin'",
		})
		return
	}

	// Validate status
	if req.Status != models.StatusActive && req.Status != models.StatusPendingApproval && req.Status != models.StatusInactive {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid status. Must be 'active', 'pending_approval', or 'inactive'",
		})
		return
	}

	user, err := h.adminService.CreateUser(req.Name, req.Email, req.UniqueIdentifier, req.Password, req.Role, req.Status)
	if err != nil {
		if err.Error() == "failed to create user: email already exists" {
			c.JSON(http.StatusConflict, gin.H{
				"error": "Email already exists",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create user",
			"details": err.Error(),
		})
		return
	}

	response := UserResponse{
		ID:               user.ID.String(),
		Name:             user.Name,
		Email:            user.Email,
		UniqueIdentifier: user.UniqueIdentifier,
		Role:             user.Role,
		Status:           user.Status,
		CreatedAt:        user.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:        user.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User created successfully",
		"user":    response,
	})
}

// UpdateUser handles PUT /api/admin/users/{userId}
func (h *AdminHandler) UpdateUser(c *gin.Context) {
	userID := c.Param("userId")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User ID is required",
		})
		return
	}

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request payload",
			"details": err.Error(),
		})
		return
	}

	// Build updates map
	updates := make(map[string]interface{})

	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Email != nil {
		updates["email"] = *req.Email
	}
	if req.UniqueIdentifier != nil {
		updates["unique_identifier"] = *req.UniqueIdentifier
	}
	if req.Role != nil {
		// Validate role
		if *req.Role != models.RoleStudent && *req.Role != models.RoleLecturer && *req.Role != models.RoleAdmin {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid role. Must be 'student', 'lecturer', or 'admin'",
			})
			return
		}
		updates["role"] = string(*req.Role)
	}
	if req.Status != nil {
		// Validate status
		if *req.Status != models.StatusActive && *req.Status != models.StatusPendingApproval && *req.Status != models.StatusInactive {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid status. Must be 'active', 'pending_approval', or 'inactive'",
			})
			return
		}
		updates["status"] = string(*req.Status)
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No updates provided",
		})
		return
	}

	user, err := h.adminService.UpdateUser(userID, updates)
	if err != nil {
		if err.Error() == "failed to update user: user not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "User not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update user",
			"details": err.Error(),
		})
		return
	}

	response := UserResponse{
		ID:               user.ID.String(),
		Name:             user.Name,
		Email:            user.Email,
		UniqueIdentifier: user.UniqueIdentifier,
		Role:             user.Role,
		Status:           user.Status,
		CreatedAt:        user.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:        user.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User updated successfully",
		"user":    response,
	})
}

// DeleteUser handles DELETE /api/admin/users/{userId}
func (h *AdminHandler) DeleteUser(c *gin.Context) {
	userID := c.Param("userId")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User ID is required",
		})
		return
	}

	err := h.adminService.DeleteUser(userID)
	if err != nil {
		if err.Error() == "failed to get user: user not found" || err.Error() == "failed to delete user: user not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "User not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete user",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User deleted successfully",
		"success": true,
	})
}