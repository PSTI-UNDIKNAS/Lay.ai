package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"lay.ai/backend/internal/services"
)

type LearningUnitHandler struct {
	learningUnitService *services.LearningUnitService
	courseService       *services.CourseService
}

func NewLearningUnitHandler(learningUnitService *services.LearningUnitService, courseService *services.CourseService) *LearningUnitHandler {
	return &LearningUnitHandler{
		learningUnitService: learningUnitService,
		courseService:       courseService,
	}
}

// CreateLearningUnit handles POST /api/learning-units/courses/{courseId}/units - Lecturer only (course owner)
func (h *LearningUnitHandler) CreateLearningUnit(c *gin.Context) {
	// Get user from context (for future authorization checks)
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get course ID from URL
	courseIDStr := c.Param("courseId")
	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	// Verify course ownership (for future implementation)
	// TODO: Add course ownership verification

	// Parse request body
	var req struct {
		Title       string `json:"title" binding:"required"`
		Description string `json:"description"`
		OrderIndex  int    `json:"order_index"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Create learning unit
	unit, err := h.learningUnitService.CreateLearningUnit(courseID.String(), req.Title, req.Description, req.OrderIndex)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create learning unit"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"unit": unit})
}

// GetLearningUnits handles GET /api/learning-units/courses/{courseId}/units - Enrolled students only
func (h *LearningUnitHandler) GetLearningUnits(c *gin.Context) {
	// Get user from context
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get course ID from URL
	courseIDStr := c.Param("courseId")
	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	// TODO: Verify user is enrolled in the course

	// Parse query parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	// Get learning units
	units, err := h.learningUnitService.GetLearningUnitsByCourseID(courseID.String(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch learning units"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"units": units})
}

// GetLearningUnitByID handles GET /api/learning-units/{unitId} - Enrolled students only
func (h *LearningUnitHandler) GetLearningUnitByID(c *gin.Context) {
	// Get user from context
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get unit ID from URL
	unitIDStr := c.Param("unitId")
	unitID, err := uuid.Parse(unitIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid unit ID"})
		return
	}

	// TODO: Verify user is enrolled in the course that contains this unit

	// Get learning unit
	unit, err := h.learningUnitService.GetLearningUnitByID(unitID.String())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Learning unit not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"unit": unit})
}

// UpdateLearningUnit handles PUT /api/learning-units/{unitId} - Lecturer only (course owner)
func (h *LearningUnitHandler) UpdateLearningUnit(c *gin.Context) {
	// Get user from context
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get unit ID from URL
	unitIDStr := c.Param("unitId")
	unitID, err := uuid.Parse(unitIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid unit ID"})
		return
	}

	// TODO: Verify course ownership

	// Parse request body
	var req struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		OrderIndex  int    `json:"order_index"`
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
	if req.OrderIndex > 0 {
		updates["order_index"] = req.OrderIndex
	}

	// Update learning unit
	unit, err := h.learningUnitService.UpdateLearningUnit(unitID.String(), updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"unit": unit})
}

// DeleteLearningUnit handles DELETE /api/learning-units/{unitId} - Lecturer only (course owner)
func (h *LearningUnitHandler) DeleteLearningUnit(c *gin.Context) {
	// Get user from context
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get unit ID from URL
	unitIDStr := c.Param("unitId")
	unitID, err := uuid.Parse(unitIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid unit ID"})
		return
	}

	// TODO: Verify course ownership

	// Delete learning unit
	err = h.learningUnitService.DeleteLearningUnit(unitID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Learning unit deleted successfully"})
}