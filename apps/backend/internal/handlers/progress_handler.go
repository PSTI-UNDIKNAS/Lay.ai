package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"lay.ai/backend/internal/models"
	"lay.ai/backend/internal/services"
	"lay.ai/backend/internal/store"
)

type ProgressHandler struct {
	// For now, we'll use existing services until we create dedicated progress services
	courseService       *services.CourseService
	learningUnitService *services.LearningUnitService
	assignmentService   *services.AssignmentService
	quizService         *services.QuizService
	submissionService   *services.SubmissionService
	enrollmentStore     *store.EnrollmentStore
}

func NewProgressHandler(
	courseService *services.CourseService,
	learningUnitService *services.LearningUnitService,
	assignmentService *services.AssignmentService,
	quizService *services.QuizService,
	submissionService *services.SubmissionService,
	enrollmentStore *store.EnrollmentStore,
) *ProgressHandler {
	return &ProgressHandler{
		courseService:       courseService,
		learningUnitService: learningUnitService,
		assignmentService:   assignmentService,
		quizService:         quizService,
		submissionService:   submissionService,
		enrollmentStore:     enrollmentStore,
	}
}

// GetStudentProgress handles GET /api/progress/courses/{courseId}/me - Enrolled students only
func (h *ProgressHandler) GetStudentProgress(c *gin.Context) {
	// Get user from context
	userID, exists := c.Get("user_id")
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
	// TODO: Get actual progress data from a dedicated progress service

	// For now, return a placeholder response
	c.JSON(http.StatusOK, gin.H{
		"course_id":  courseID,
		"student_id": userID,
		"progress": gin.H{
			"completed_units":       0,
			"total_units":           0,
			"completed_assignments": 0,
			"total_assignments":     0,
			"completed_quizzes":     0,
			"total_quizzes":         0,
			"overall_progress":      0.0,
		},
	})
}

// CompleteUnit handles POST /api/progress/units/{unitId}/complete - Enrolled students only
func (h *ProgressHandler) CompleteUnit(c *gin.Context) {
	// Get user from context
	userID, exists := c.Get("user_id")
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
	// TODO: Mark unit as completed in a dedicated progress service

	// For now, return a success response
	c.JSON(http.StatusOK, gin.H{
		"message":      "Unit marked as completed",
		"unit_id":      unitID,
		"student_id":   userID,
		"completed_at": "2024-01-01T00:00:00Z", // Placeholder timestamp
	})
}

// SubmitAssignment handles POST /api/progress/assignments/{assignmentId}/submit - Enrolled students only
func (h *ProgressHandler) SubmitAssignment(c *gin.Context) {
	// Get user from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get assignment ID from URL
	assignmentIDStr := c.Param("assignmentId")
	assignmentID, err := uuid.Parse(assignmentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assignment ID"})
		return
	}

	// Parse request body
	var req struct {
		Content     string   `json:"content" binding:"required"`
		Attachments []string `json:"attachments"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// TODO: Verify user is enrolled in the course that contains this assignment
	// TODO: Create submission using submission service

	// For now, return a success response
	c.JSON(http.StatusCreated, gin.H{
		"message":       "Assignment submitted successfully",
		"assignment_id": assignmentID,
		"student_id":    userID,
		"submitted_at":  "2024-01-01T00:00:00Z", // Placeholder timestamp
	})
}

// SubmitQuiz handles POST /api/progress/quizzes/{quizId}/submit - Enrolled students only
func (h *ProgressHandler) SubmitQuiz(c *gin.Context) {
	// Get user from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userIDStr, ok := userIDVal.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get quiz ID from URL
	quizIDStr := c.Param("quizId")
	quizID, err := uuid.Parse(quizIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid quiz ID"})
		return
	}

	// Parse request body
	var req struct {
		Answers []models.QuizSubmissionAnswer `json:"answers" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	quiz, err := h.quizService.GetQuizByID(quizID.String())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quiz not found"})
		return
	}

	unit, err := h.learningUnitService.GetLearningUnitByID(quiz.LearningUnitID.String())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Learning unit not found"})
		return
	}

	enrollment, err := h.enrollmentStore.GetEnrollmentByStudentAndCourse(userID.String(), unit.CourseID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify enrollment"})
		return
	}
	if enrollment == nil || enrollment.Status != models.EnrollmentStatusEnrolled {
		c.JSON(http.StatusForbidden, gin.H{"error": "Enrollment required"})
		return
	}

	attempt, err := h.quizService.SubmitQuizAttempt(c.Request.Context(), quizID, userID, req.Answers)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":      "Quiz submitted successfully",
		"quiz_id":      attempt.QuizID,
		"student_id":   attempt.StudentID,
		"attempt_no":   attempt.AttemptNo,
		"score":        attempt.Score,
		"max_score":    attempt.MaxScore,
		"submitted_at": attempt.CreatedAt,
	})
}
