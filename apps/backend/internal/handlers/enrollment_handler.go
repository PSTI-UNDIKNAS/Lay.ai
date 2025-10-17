package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"lay.ai/backend/internal/services"
)

type EnrollmentHandler struct {
	enrollmentService *services.EnrollmentService
}

func NewEnrollmentHandler(enrollmentService *services.EnrollmentService) *EnrollmentHandler {
	return &EnrollmentHandler{
		enrollmentService: enrollmentService,
	}
}

// JoinCourse handles POST /api/courses/{courseId}/join - Student only
func (h *EnrollmentHandler) JoinCourse(c *gin.Context) {
	// Get user from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Parse course ID from URL
	courseIDStr := c.Param("courseId")
	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	// Parse student ID
	studentID, err := uuid.Parse(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Parse request body for password (if needed)
	var req struct {
		Password string `json:"password"`
	}
	c.ShouldBindJSON(&req)

	// Join course
	enrollment, err := h.enrollmentService.JoinCourse(studentID, courseID, req.Password)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"enrollment": enrollment})
}

// RequestAccess handles POST /api/courses/{courseId}/request-access - Student only
func (h *EnrollmentHandler) RequestAccess(c *gin.Context) {
	// Get user from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Parse course ID from URL
	courseIDStr := c.Param("courseId")
	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	// Parse student ID
	studentID, err := uuid.Parse(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Request access
	enrollment, err := h.enrollmentService.RequestAccess(studentID, courseID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"enrollment": enrollment})
}

// GetAccessRequests handles GET /api/courses/{courseId}/access-requests - Lecturer only (course owner)
func (h *EnrollmentHandler) GetAccessRequests(c *gin.Context) {
	// Parse course ID from URL
	courseIDStr := c.Param("courseId")
	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	// Get access requests
	requests, err := h.enrollmentService.GetAccessRequests(courseID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch access requests"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"requests": requests})
}

// ApproveAccessRequest handles POST /api/access-requests/{requestId}/approve - Lecturer only (course owner)
func (h *EnrollmentHandler) ApproveAccessRequest(c *gin.Context) {
	// Get user from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Parse request ID from URL
	requestIDStr := c.Param("requestId")
	requestID, err := uuid.Parse(requestIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	// Parse lecturer ID
	lecturerID, err := uuid.Parse(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Parse request body
	var req struct {
		Approved bool `json:"approved" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Approve or deny access request
	err = h.enrollmentService.ApproveAccessRequest(lecturerID, requestID, req.Approved)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	action := "denied"
	if req.Approved {
		action = "approved"
	}

	c.JSON(http.StatusOK, gin.H{"message": "Access request " + action + " successfully"})
}

// GetMyEnrollments handles GET /api/enrollments/me - Student only
func (h *EnrollmentHandler) GetMyEnrollments(c *gin.Context) {
	// Get user from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get enrollments for the student
	enrollments, err := h.enrollmentService.GetEnrollmentsByStudent(userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch enrollments"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"enrollments": enrollments})
}

// UnenrollFromCourse handles DELETE /api/courses/{courseId}/unenroll - Student only
func (h *EnrollmentHandler) UnenrollFromCourse(c *gin.Context) {
	// Get user from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Parse course ID from URL
	courseIDStr := c.Param("courseId")
	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	// Parse student ID
	studentID, err := uuid.Parse(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Unenroll from course
	err = h.enrollmentService.UnenrollFromCourse(studentID, courseID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully unenrolled from course"})
}