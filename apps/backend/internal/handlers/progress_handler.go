package handlers

import (
	"net/http"
	"path/filepath"
	"strings"

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
	aiService           *services.AIService
}

func NewProgressHandler(
	courseService *services.CourseService,
	learningUnitService *services.LearningUnitService,
	assignmentService *services.AssignmentService,
	quizService *services.QuizService,
	submissionService *services.SubmissionService,
	enrollmentStore *store.EnrollmentStore,
	aiService *services.AIService,
) *ProgressHandler {
	return &ProgressHandler{
		courseService:       courseService,
		learningUnitService: learningUnitService,
		assignmentService:   assignmentService,
		quizService:         quizService,
		submissionService:   submissionService,
		enrollmentStore:     enrollmentStore,
		aiService:           aiService,
	}
}

type GenerateAssignmentUploadURLRequest struct {
	FileName string `json:"fileName" binding:"required"`
}

type GenerateAssignmentUploadURLResponse struct {
	UploadURL   string `json:"uploadUrl"`
	NewFileName string `json:"newFileName"`
}

func (h *ProgressHandler) GenerateAssignmentUploadURL(c *gin.Context) {
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

	assignmentIDStr := c.Param("assignmentId")
	assignmentID, err := uuid.Parse(assignmentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assignment ID"})
		return
	}

	var req GenerateAssignmentUploadURLRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	if strings.ToLower(filepath.Ext(req.FileName)) != ".pdf" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only pdf file are accepted"})
		return
	}

	assignment, err := h.assignmentService.GetAssignmentByID(assignmentID.String())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found"})
		return
	}

	unit, err := h.learningUnitService.GetLearningUnitByID(assignment.LearningUnitID.String())
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

	uploadURL, newFileName, err := h.aiService.GeneratePresignedUploadURL(c.Request.Context(), req.FileName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, GenerateAssignmentUploadURLResponse{
		UploadURL:   uploadURL,
		NewFileName: newFileName,
	})
}

type UploadAssignmentPDFResponse struct {
	NewFileName string `json:"newFileName"`
}

func (h *ProgressHandler) UploadAssignmentPDF(c *gin.Context) {
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

	assignmentIDStr := c.Param("assignmentId")
	assignmentID, err := uuid.Parse(assignmentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assignment ID"})
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}

	if strings.ToLower(filepath.Ext(fileHeader.Filename)) != ".pdf" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only pdf file are accepted"})
		return
	}

	assignment, err := h.assignmentService.GetAssignmentByID(assignmentID.String())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found"})
		return
	}

	unit, err := h.learningUnitService.GetLearningUnitByID(assignment.LearningUnitID.String())
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

	assignmentIDParam := assignmentID.String()
	studentIDParam := userID.String()
	existing, err := h.submissionService.GetSubmissions(&assignmentIDParam, &studentIDParam, 1, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch existing submissions"})
		return
	}
	if len(existing) > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Assignment already submitted"})
		return
	}

	f, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open uploaded file"})
		return
	}
	defer f.Close()

	newFileName, err := h.aiService.UploadPDFToR2(c.Request.Context(), fileHeader.Filename, f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, UploadAssignmentPDFResponse{NewFileName: newFileName})
}

func (h *ProgressHandler) GetMyAssignmentSubmission(c *gin.Context) {
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

	assignmentIDStr := c.Param("assignmentId")
	assignmentID, err := uuid.Parse(assignmentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assignment ID"})
		return
	}

	assignment, err := h.assignmentService.GetAssignmentByID(assignmentID.String())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found"})
		return
	}

	unit, err := h.learningUnitService.GetLearningUnitByID(assignment.LearningUnitID.String())
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

	assignmentIDParam := assignmentID.String()
	studentIDParam := userID.String()
	list, err := h.submissionService.GetSubmissions(&assignmentIDParam, &studentIDParam, 1, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch submission"})
		return
	}
	if len(list) == 0 {
		c.JSON(http.StatusOK, gin.H{"submitted": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"submitted":  true,
		"submission": list[0],
	})
}

func (h *ProgressHandler) GetMyAssignmentSubmissionsByUnit(c *gin.Context) {
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

	unitIDStr := c.Param("unitId")
	unitID, err := uuid.Parse(unitIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid unit ID"})
		return
	}

	unit, err := h.learningUnitService.GetLearningUnitByID(unitID.String())
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

	submissions, err := h.submissionService.GetSubmissionsByStudentAndUnit(userID.String(), unitID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch submissions"})
		return
	}

	ids := make([]string, 0, len(submissions))
	for _, s := range submissions {
		ids = append(ids, s.AssignmentID.String())
	}

	c.JSON(http.StatusOK, gin.H{
		"unit_id":                  unitID.String(),
		"submitted_assignment_ids": ids,
		"submissions":              submissions,
	})
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

	// Get assignment ID from URL
	assignmentIDStr := c.Param("assignmentId")
	assignmentID, err := uuid.Parse(assignmentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assignment ID"})
		return
	}

	// Parse request body
	var req models.CreateSubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if strings.ToLower(filepath.Ext(req.FilePath)) != ".pdf" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only pdf file are accepted"})
		return
	}

	assignment, err := h.assignmentService.GetAssignmentByID(assignmentID.String())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found"})
		return
	}

	unit, err := h.learningUnitService.GetLearningUnitByID(assignment.LearningUnitID.String())
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

	assignmentIDParam := assignmentID.String()
	studentIDParam := userID.String()
	existing, err := h.submissionService.GetSubmissions(&assignmentIDParam, &studentIDParam, 1, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch existing submissions"})
		return
	}

	if len(existing) > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Assignment already submitted"})
		return
	}

	submission, err := h.submissionService.CreateSubmission(assignmentID.String(), userID.String(), req.FilePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":    "Assignment submitted successfully",
		"submission": submission,
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
