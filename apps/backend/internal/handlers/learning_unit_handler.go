package handlers

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"lay.ai/backend/internal/models"
	"lay.ai/backend/internal/services"
	"lay.ai/backend/internal/store"
)

type LearningUnitHandler struct {
	learningUnitService *services.LearningUnitService
	courseService       *services.CourseService
	assignmentService   *services.AssignmentService
	aiService           *services.AIService
	enrollmentStore     *store.EnrollmentStore
	assignmentStore     *store.AssignmentStore
	documentStore       *store.DocumentStore
	quizStore           *store.QuizStore
}

func NewLearningUnitHandler(
	learningUnitService *services.LearningUnitService,
	courseService *services.CourseService,
	assignmentService *services.AssignmentService,
	aiService *services.AIService,
	enrollmentStore *store.EnrollmentStore,
	assignmentStore *store.AssignmentStore,
	documentStore *store.DocumentStore,
	quizStore *store.QuizStore,
) *LearningUnitHandler {
	return &LearningUnitHandler{
		learningUnitService: learningUnitService,
		courseService:       courseService,
		assignmentService:   assignmentService,
		aiService:           aiService,
		enrollmentStore:     enrollmentStore,
		assignmentStore:     assignmentStore,
		documentStore:       documentStore,
		quizStore:           quizStore,
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
		UnitOrder   int    `json:"unit_order"`
		OrderIndex  int    `json:"order_index"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	unitOrder := req.UnitOrder
	if unitOrder == 0 {
		unitOrder = req.OrderIndex
	}

	// Create learning unit
	unit, err := h.learningUnitService.CreateLearningUnit(courseID.String(), req.Title, req.Description, unitOrder)
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
		UnitOrder   int    `json:"unit_order"`
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
	unitOrder := req.UnitOrder
	if unitOrder == 0 {
		unitOrder = req.OrderIndex
	}
	if unitOrder > 0 {
		updates["unit_order"] = unitOrder
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

// CreateAssignment handles POST /api/learning-units/{unitId}/assignments - Lecturer only
func (h *LearningUnitHandler) CreateAssignment(c *gin.Context) {
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	unitIDStr := c.Param("unitId")
	unitID, err := uuid.Parse(unitIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid unit ID"})
		return
	}

	_, err = h.learningUnitService.GetLearningUnitByID(unitID.String())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Learning unit not found"})
		return
	}

	var req struct {
		Title       string  `json:"title" binding:"required"`
		Description string  `json:"description"`
		DueDate     *string `json:"due_date"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	assignment, err := h.assignmentService.CreateAssignment(unitID.String(), req.Title, req.Description, req.DueDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"assignment": assignment})
}

// GetAssignments handles GET /api/learning-units/{unitId}/assignments - Lecturer only
func (h *LearningUnitHandler) GetAssignments(c *gin.Context) {
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	unitIDStr := c.Param("unitId")
	unitID, err := uuid.Parse(unitIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid unit ID"})
		return
	}

	_, err = h.learningUnitService.GetLearningUnitByID(unitID.String())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Learning unit not found"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	assignments, err := h.assignmentService.GetAssignmentsByLearningUnitID(unitID.String(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch assignments"})
		return
	}

	resp := models.GetAssignmentsResponse{
		Assignments: make([]models.AssignmentResponse, 0, len(assignments)),
		Total:       len(assignments),
	}
	for _, a := range assignments {
		resp.Assignments = append(resp.Assignments, models.AssignmentResponse{
			ID:             a.ID,
			LearningUnitID: a.LearningUnitID,
			Title:          a.Title,
			Description:    a.Description,
			DueDate:        a.DueDate,
			CreatedAt:      a.CreatedAt,
			UpdatedAt:      a.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, resp)
}

func (h *LearningUnitHandler) GetAssignmentSubmissions(c *gin.Context) {
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	unitIDStr := c.Param("unitId")
	unitID, err := uuid.Parse(unitIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid unit ID"})
		return
	}

	assignmentIDStr := c.Param("assignmentId")
	assignmentID, err := uuid.Parse(assignmentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assignment ID"})
		return
	}

	unit, err := h.learningUnitService.GetLearningUnitByID(unitID.String())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Learning unit not found"})
		return
	}

	course, err := h.courseService.GetCourseByID(unit.CourseID.String())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	lecturerID, err := uuid.Parse(userIDValue.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	if course.CreatorID != lecturerID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	assignment, err := h.assignmentService.GetAssignmentByID(assignmentID.String())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found"})
		return
	}
	if assignment.LearningUnitID != unitID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Assignment does not belong to this learning unit"})
		return
	}

	students, err := h.enrollmentStore.GetEnrolledStudentsByCourseID(unit.CourseID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch enrolled students"})
		return
	}

	assignmentIDParam := assignment.ID.String()
	submissions, err := h.assignmentService.GetSubmissions(&assignmentIDParam, nil, 1000, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch submissions"})
		return
	}

	subByStudent := make(map[string]*models.Submission, len(submissions))
	for _, s := range submissions {
		sid := s.StudentID.String()
		if _, ok := subByStudent[sid]; ok {
			continue
		}
		subByStudent[sid] = s
	}

	type row struct {
		Student    *models.User       `json:"student"`
		Submission *models.Submission `json:"submission"`
	}

	rows := make([]row, 0, len(students))
	submittedCount := 0
	for _, student := range students {
		sub := subByStudent[student.ID.String()]
		if sub != nil {
			submittedCount++
		}
		rows = append(rows, row{
			Student:    student,
			Submission: sub,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"unit_id":         unitID.String(),
		"assignment_id":   assignmentID.String(),
		"total_students":  len(students),
		"submitted_count": submittedCount,
		"rows":            rows,
	})
}

func (h *LearningUnitHandler) DownloadSubmission(c *gin.Context) {
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	unitIDStr := c.Param("unitId")
	unitID, err := uuid.Parse(unitIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid unit ID"})
		return
	}

	assignmentIDStr := c.Param("assignmentId")
	assignmentID, err := uuid.Parse(assignmentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assignment ID"})
		return
	}

	submissionIDStr := c.Param("submissionId")
	submissionID, err := uuid.Parse(submissionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	unit, err := h.learningUnitService.GetLearningUnitByID(unitID.String())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Learning unit not found"})
		return
	}

	course, err := h.courseService.GetCourseByID(unit.CourseID.String())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	lecturerID, err := uuid.Parse(userIDValue.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	if course.CreatorID != lecturerID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	assignment, err := h.assignmentService.GetAssignmentByID(assignmentID.String())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found"})
		return
	}
	if assignment.LearningUnitID != unitID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Assignment does not belong to this learning unit"})
		return
	}

	submission, err := h.assignmentService.GetSubmissionByID(submissionID.String())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
		return
	}
	if submission.AssignmentID != assignment.ID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Submission does not belong to this assignment"})
		return
	}

	keyPath := submission.FilePath
	if strings.Contains(keyPath, "://") {
		if u, err := url.Parse(keyPath); err == nil {
			keyPath = u.Path
		}
	}
	key := strings.TrimPrefix(path.Clean(keyPath), "/")
	key = path.Base(key)

	body, err := h.aiService.DownloadPDFFromR2(c.Request.Context(), key)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer body.Close()

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=%q", key))
	c.Status(http.StatusOK)
	_, _ = io.Copy(c.Writer, body)
}

func (h *LearningUnitHandler) GetLearningUnitSummaries(c *gin.Context) {
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	courseIDStr := c.Param("courseId")
	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	units, err := h.learningUnitService.GetLearningUnitsByCourseID(courseID.String(), 10_000, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch learning units"})
		return
	}

	unitIDs := make([]uuid.UUID, 0, len(units))
	for _, unit := range units {
		if unit == nil {
			continue
		}
		unitIDs = append(unitIDs, unit.ID)
	}

	docCounts, err := h.documentStore.CountDocumentsByLearningUnitIDs(c.Request.Context(), unitIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count materials"})
		return
	}

	assignmentCounts, err := h.assignmentStore.CountAssignmentsByLearningUnitIDs(unitIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count assignments"})
		return
	}

	quizCounts, err := h.quizStore.CountQuizzesByLearningUnitIDs(unitIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count quizzes"})
		return
	}

	type unitSummary struct {
		UnitID          string `json:"unit_id"`
		MaterialCount   int    `json:"material_count"`
		AssignmentCount int    `json:"assignment_count"`
		QuizCount       int    `json:"quiz_count"`
	}

	summaries := make([]unitSummary, 0, len(units))
	for _, unit := range units {
		if unit == nil {
			continue
		}
		summaries = append(summaries, unitSummary{
			UnitID:          unit.ID.String(),
			MaterialCount:   docCounts[unit.ID],
			AssignmentCount: assignmentCounts[unit.ID],
			QuizCount:       quizCounts[unit.ID],
		})
	}

	c.JSON(http.StatusOK, gin.H{"summaries": summaries})
}
