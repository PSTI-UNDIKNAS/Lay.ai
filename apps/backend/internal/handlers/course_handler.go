package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"lay.ai/backend/internal/models"
	"lay.ai/backend/internal/services"
)

type CourseHandler struct {
	courseService *services.CourseService
}

func NewCourseHandler(courseService *services.CourseService) *CourseHandler {
	return &CourseHandler{
		courseService: courseService,
	}
}

// GetCourses handles GET /api/courses - Public access
func (h *CourseHandler) GetCourses(c *gin.Context) {
	// Parse query parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	creatorID := c.Query("creator_id")

	var creatorIDPtr *string
	if creatorID != "" {
		creatorIDPtr = &creatorID
	}

	courses, err := h.courseService.GetCourses(creatorIDPtr, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch courses"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"courses": courses})
}

// CreateCourse handles POST /api/courses - Lecturer only
func (h *CourseHandler) CreateCourse(c *gin.Context) {
	// Get user from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Parse request body
	var req struct {
		Title       string             `json:"title" binding:"required"`
		Description string             `json:"description"`
		AccessType  models.AccessType  `json:"access_type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Create course
	course, err := h.courseService.CreateCourse(req.Title, req.Description, userID.(string), req.AccessType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create course"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"course": course})
}

// GetCourseByID handles GET /api/courses/{courseId} - Public access
func (h *CourseHandler) GetCourseByID(c *gin.Context) {
	courseIDStr := c.Param("courseId")
	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	course, err := h.courseService.GetCourseByID(courseID.String())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"course": course})
}

// UpdateCourse handles PUT /api/courses/{courseId} - Lecturer only (course owner)
func (h *CourseHandler) UpdateCourse(c *gin.Context) {
	courseIDStr := c.Param("courseId")
	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	// Get user from context
	if _, exists := c.Get("user_id"); !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Parse request body
	var req struct {
		Title       string             `json:"title"`
		Description string             `json:"description"`
		AccessType  models.AccessType  `json:"access_type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Create updates map
	updates := make(map[string]interface{})
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	updates["access_type"] = req.AccessType

	// Update course
	course, err := h.courseService.UpdateCourse(courseID.String(), updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"course": course})
}

// DeleteCourse handles DELETE /api/courses/{courseId} - Lecturer only (course owner)
func (h *CourseHandler) DeleteCourse(c *gin.Context) {
	courseIDStr := c.Param("courseId")
	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	// Get user from context (for future authorization checks)
	if _, exists := c.Get("user_id"); !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Delete course
	err = h.courseService.DeleteCourse(courseID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Course deleted successfully"})
}