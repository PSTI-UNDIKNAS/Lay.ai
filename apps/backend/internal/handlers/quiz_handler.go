package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"lay.ai/backend/internal/services"
)

type QuizHandler struct {
	aiService           *services.AIService
	learningUnitService *services.LearningUnitService
	courseService       *services.CourseService
}

func NewQuizHandler(aiService *services.AIService, luService *services.LearningUnitService, courseService *services.CourseService) *QuizHandler {
	return &QuizHandler{
		aiService:           aiService,
		learningUnitService: luService,
		courseService:       courseService,
	}
}

type GenerateQuizRequest struct {
	LearningUnitIDs []string `json:"learning_unit_ids"`
}

// GenerateQuiz handles POST /api/courses/{courseId}/quiz/generate
func (h *QuizHandler) GenerateQuiz(c *gin.Context) {
	courseIDStr := c.Param("courseId")
	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	// Validate course exists
	_, err = h.courseService.GetCourseByID(courseIDStr)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	var req GenerateQuizRequest
	// Bind JSON is optional; if body is empty, we assume all units
	if c.Request.ContentLength > 0 {
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}
	}

	var targetUnitIDs []uuid.UUID

	if len(req.LearningUnitIDs) > 0 {
		// Validate provided unit IDs
		for _, idStr := range req.LearningUnitIDs {
			id, err := uuid.Parse(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid learning unit ID: " + idStr})
				return
			}

			// Verify unit belongs to course
			unit, err := h.learningUnitService.GetLearningUnitByID(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Learning unit not found: " + idStr})
				return
			}
			if unit.CourseID != courseID {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Learning unit does not belong to this course: " + idStr})
				return
			}

			targetUnitIDs = append(targetUnitIDs, id)
		}
	} else {
		// Fetch all units for the course if none specified
		units, err := h.learningUnitService.GetLearningUnitsByCourseID(courseIDStr, 100, 0)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch course learning units"})
			return
		}
		if len(units) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No learning units found for this course"})
			return
		}
		for _, u := range units {
			targetUnitIDs = append(targetUnitIDs, u.ID)
		}
	}

	if len(targetUnitIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No learning units available for quiz generation"})
		return
	}

	// Get user ID from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}
	userIDStr, ok := userIDVal.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user UUID"})
		return
	}

	// Generate Quiz
	quizResponse, err := h.aiService.GenerateQuiz(c.Request.Context(), userID, courseID, targetUnitIDs)
	if err != nil {
		if err.Error() == "no content available for the selected learning units" {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate quiz", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, quizResponse)
}

type GenerateFlashcardsRequest struct {
	LearningUnitIDs []string `json:"learning_unit_ids"`
}

// GenerateFlashcards handles POST /api/courses/{courseId}/flashcards/generate
func (h *QuizHandler) GenerateFlashcards(c *gin.Context) {
	courseIDStr := c.Param("courseId")
	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	// Validate course exists
	_, err = h.courseService.GetCourseByID(courseIDStr)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	var req GenerateFlashcardsRequest
	// Bind JSON is optional; if body is empty, we assume all units
	if c.Request.ContentLength > 0 {
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}
	}

	var targetUnitIDs []uuid.UUID

	if len(req.LearningUnitIDs) > 0 {
		// Validate provided unit IDs
		for _, idStr := range req.LearningUnitIDs {
			id, err := uuid.Parse(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid learning unit ID: " + idStr})
				return
			}

			// Verify unit belongs to course
			unit, err := h.learningUnitService.GetLearningUnitByID(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Learning unit not found: " + idStr})
				return
			}
			if unit.CourseID != courseID {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Learning unit does not belong to this course: " + idStr})
				return
			}

			targetUnitIDs = append(targetUnitIDs, id)
		}
	} else {
		// Fetch all units for the course if none specified
		units, err := h.learningUnitService.GetLearningUnitsByCourseID(courseIDStr, 100, 0)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch course learning units"})
			return
		}
		if len(units) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No learning units found for this course"})
			return
		}
		for _, u := range units {
			targetUnitIDs = append(targetUnitIDs, u.ID)
		}
	}

	if len(targetUnitIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No learning units available for flashcard generation"})
		return
	}

	// Get user ID from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}
	userIDStr, ok := userIDVal.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user UUID"})
		return
	}

	// Generate Flashcards
	flashcardsResponse, err := h.aiService.GenerateFlashcards(c.Request.Context(), userID, courseID, targetUnitIDs)
	if err != nil {
		if err.Error() == "no content available for the selected learning units" {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate flashcards", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, flashcardsResponse)
}
