package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"lay.ai/backend/internal/models"
	"lay.ai/backend/internal/services"
)

type AdminHandler struct {
	adminService        *services.AdminService
	courseService       *services.CourseService
	learningUnitService *services.LearningUnitService
	assignmentService   *services.AssignmentService
	quizService         *services.QuizService
	submissionService   *services.SubmissionService
}

func NewAdminHandler(
	adminService *services.AdminService,
	courseService *services.CourseService,
	learningUnitService *services.LearningUnitService,
	assignmentService *services.AssignmentService,
	quizService *services.QuizService,
	submissionService *services.SubmissionService,
) *AdminHandler {
	return &AdminHandler{
		adminService:        adminService,
		courseService:       courseService,
		learningUnitService: learningUnitService,
		assignmentService:   assignmentService,
		quizService:         quizService,
		submissionService:   submissionService,
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

// ===== CONTENT MANAGEMENT HANDLERS =====

// GetCourses handles GET /api/admin/courses
func (h *AdminHandler) GetCourses(c *gin.Context) {
	// Parse query parameters
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")
	creatorID := c.Query("creator_id")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	var creatorIDPtr *string
	if creatorID != "" {
		creatorIDPtr = &creatorID
	}

	courses, err := h.courseService.GetCourses(creatorIDPtr, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get courses",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"courses": courses,
		"count":   len(courses),
		"limit":   limit,
		"offset":  offset,
	})
}

// GetCourseByID handles GET /api/admin/courses/{courseId}
func (h *AdminHandler) GetCourseByID(c *gin.Context) {
	courseID := c.Param("courseId")
	if courseID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Course ID is required",
		})
		return
	}

	course, err := h.courseService.GetCourseByID(courseID)
	if err != nil {
		if err.Error() == "course not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Course not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get course",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, course)
}

// UpdateCourse handles PUT /api/admin/courses/{courseId}
func (h *AdminHandler) UpdateCourse(c *gin.Context) {
	courseID := c.Param("courseId")
	if courseID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Course ID is required",
		})
		return
	}

	var req models.UpdateCourseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Convert to map for updates
	updates := make(map[string]interface{})
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.AccessType != "" {
		updates["access_type"] = req.AccessType
	}
	if req.Password != "" {
		updates["password"] = req.Password
	}

	course, err := h.courseService.UpdateCourse(courseID, updates)
	if err != nil {
		if err.Error() == "course not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Course not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update course",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, course)
}

// DeleteCourse handles DELETE /api/admin/courses/{courseId}
func (h *AdminHandler) DeleteCourse(c *gin.Context) {
	courseID := c.Param("courseId")
	if courseID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Course ID is required",
		})
		return
	}

	err := h.courseService.DeleteCourse(courseID)
	if err != nil {
		if err.Error() == "course not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Course not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete course",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Course deleted successfully",
		"success": true,
	})
}

// GetLearningUnits handles GET /api/admin/learning-units
func (h *AdminHandler) GetLearningUnits(c *gin.Context) {
	courseID := c.Query("course_id")
	if courseID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Course ID is required",
		})
		return
	}

	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	learningUnits, err := h.learningUnitService.GetLearningUnitsByCourseID(courseID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get learning units",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"learning_units": learningUnits,
		"count":          len(learningUnits),
		"limit":          limit,
		"offset":         offset,
	})
}

// GetLearningUnitByID handles GET /api/admin/learning-units/{unitId}
func (h *AdminHandler) GetLearningUnitByID(c *gin.Context) {
	unitID := c.Param("unitId")
	if unitID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Learning unit ID is required",
		})
		return
	}

	learningUnit, err := h.learningUnitService.GetLearningUnitByID(unitID)
	if err != nil {
		if err.Error() == "learning unit not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Learning unit not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get learning unit",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, learningUnit)
}

// UpdateLearningUnit handles PUT /api/admin/learning-units/{unitId}
func (h *AdminHandler) UpdateLearningUnit(c *gin.Context) {
	unitID := c.Param("unitId")
	if unitID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Learning unit ID is required",
		})
		return
	}

	var req models.UpdateLearningUnitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Convert to map for updates
	updates := make(map[string]interface{})
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.UnitOrder > 0 {
		updates["unit_order"] = req.UnitOrder
	}

	learningUnit, err := h.learningUnitService.UpdateLearningUnit(unitID, updates)
	if err != nil {
		if err.Error() == "learning unit not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Learning unit not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update learning unit",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, learningUnit)
}

// DeleteLearningUnit handles DELETE /api/admin/learning-units/{unitId}
func (h *AdminHandler) DeleteLearningUnit(c *gin.Context) {
	unitID := c.Param("unitId")
	if unitID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Learning unit ID is required",
		})
		return
	}

	err := h.learningUnitService.DeleteLearningUnit(unitID)
	if err != nil {
		if err.Error() == "learning unit not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Learning unit not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete learning unit",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Learning unit deleted successfully",
		"success": true,
	})
}

// GetAssignments handles GET /api/admin/assignments
func (h *AdminHandler) GetAssignments(c *gin.Context) {
	learningUnitID := c.Query("learning_unit_id")
	if learningUnitID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Learning unit ID is required",
		})
		return
	}

	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	assignments, err := h.assignmentService.GetAssignmentsByLearningUnitID(learningUnitID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get assignments",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"assignments": assignments,
		"count":       len(assignments),
		"limit":       limit,
		"offset":      offset,
	})
}

// GetAssignmentByID handles GET /api/admin/assignments/{assignmentId}
func (h *AdminHandler) GetAssignmentByID(c *gin.Context) {
	assignmentID := c.Param("assignmentId")
	if assignmentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Assignment ID is required",
		})
		return
	}

	assignment, err := h.assignmentService.GetAssignmentByID(assignmentID)
	if err != nil {
		if err.Error() == "assignment not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Assignment not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get assignment",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, assignment)
}

// UpdateAssignment handles PUT /api/admin/assignments/{assignmentId}
func (h *AdminHandler) UpdateAssignment(c *gin.Context) {
	assignmentID := c.Param("assignmentId")
	if assignmentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Assignment ID is required",
		})
		return
	}

	var req models.UpdateAssignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Convert to map for updates
	updates := make(map[string]interface{})
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.DueDate != nil {
		updates["due_date"] = req.DueDate
	}

	assignment, err := h.assignmentService.UpdateAssignment(assignmentID, updates)
	if err != nil {
		if err.Error() == "assignment not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Assignment not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update assignment",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, assignment)
}

// DeleteAssignment handles DELETE /api/admin/assignments/{assignmentId}
func (h *AdminHandler) DeleteAssignment(c *gin.Context) {
	assignmentID := c.Param("assignmentId")
	if assignmentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Assignment ID is required",
		})
		return
	}

	err := h.assignmentService.DeleteAssignment(assignmentID)
	if err != nil {
		if err.Error() == "assignment not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Assignment not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete assignment",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Assignment deleted successfully",
		"success": true,
	})
}

// GetQuizzes handles GET /api/admin/quizzes
func (h *AdminHandler) GetQuizzes(c *gin.Context) {
	learningUnitID := c.Query("learning_unit_id")
	if learningUnitID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Learning unit ID is required",
		})
		return
	}

	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	quizzes, err := h.quizService.GetQuizzesByLearningUnitID(learningUnitID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get quizzes",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"quizzes": quizzes,
		"count":   len(quizzes),
		"limit":   limit,
		"offset":  offset,
	})
}

// GetQuizByID handles GET /api/admin/quizzes/{quizId}
func (h *AdminHandler) GetQuizByID(c *gin.Context) {
	quizID := c.Param("quizId")
	if quizID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Quiz ID is required",
		})
		return
	}

	quiz, err := h.quizService.GetQuizByID(quizID)
	if err != nil {
		if err.Error() == "quiz not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Quiz not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get quiz",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, quiz)
}

// UpdateQuiz handles PUT /api/admin/quizzes/{quizId}
func (h *AdminHandler) UpdateQuiz(c *gin.Context) {
	quizID := c.Param("quizId")
	if quizID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Quiz ID is required",
		})
		return
	}

	var req models.UpdateQuizRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Convert to map for updates
	updates := make(map[string]interface{})
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.QuizData.Questions != nil {
		updates["quiz_data"] = req.QuizData
	}

	quiz, err := h.quizService.UpdateQuiz(quizID, updates)
	if err != nil {
		if err.Error() == "quiz not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Quiz not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update quiz",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, quiz)
}

// DeleteQuiz handles DELETE /api/admin/quizzes/{quizId}
func (h *AdminHandler) DeleteQuiz(c *gin.Context) {
	quizID := c.Param("quizId")
	if quizID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Quiz ID is required",
		})
		return
	}

	err := h.quizService.DeleteQuiz(quizID)
	if err != nil {
		if err.Error() == "quiz not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Quiz not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete quiz",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Quiz deleted successfully",
		"success": true,
	})
}

// GetSubmissions handles GET /api/admin/submissions
func (h *AdminHandler) GetSubmissions(c *gin.Context) {
	assignmentID := c.Query("assignment_id")
	studentID := c.Query("student_id")

	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	var assignmentIDPtr, studentIDPtr *string
	if assignmentID != "" {
		assignmentIDPtr = &assignmentID
	}
	if studentID != "" {
		studentIDPtr = &studentID
	}

	submissions, err := h.submissionService.GetSubmissions(assignmentIDPtr, studentIDPtr, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get submissions",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"submissions": submissions,
		"count":       len(submissions),
		"limit":       limit,
		"offset":      offset,
	})
}

// GetSubmissionByID handles GET /api/admin/submissions/{submissionId}
func (h *AdminHandler) GetSubmissionByID(c *gin.Context) {
	submissionID := c.Param("submissionId")
	if submissionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Submission ID is required",
		})
		return
	}

	submission, err := h.submissionService.GetSubmissionByID(submissionID)
	if err != nil {
		if err.Error() == "submission not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Submission not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get submission",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, submission)
}

// UpdateSubmission handles PUT /api/admin/submissions/{submissionId} (for grading)
func (h *AdminHandler) UpdateSubmission(c *gin.Context) {
	submissionID := c.Param("submissionId")
	if submissionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Submission ID is required",
		})
		return
	}

	var req models.UpdateSubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Convert to map for updates
	updates := make(map[string]interface{})
	if req.Grade != "" {
		updates["grade"] = req.Grade
	}
	if req.Feedback != "" {
		updates["feedback"] = req.Feedback
	}

	submission, err := h.submissionService.UpdateSubmission(submissionID, updates)
	if err != nil {
		if err.Error() == "submission not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Submission not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update submission",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, submission)
}

// DeleteSubmission handles DELETE /api/admin/submissions/{submissionId}
func (h *AdminHandler) DeleteSubmission(c *gin.Context) {
	submissionID := c.Param("submissionId")
	if submissionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Submission ID is required",
		})
		return
	}

	err := h.submissionService.DeleteSubmission(submissionID)
	if err != nil {
		if err.Error() == "submission not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Submission not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete submission",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Submission deleted successfully",
		"success": true,
	})
}