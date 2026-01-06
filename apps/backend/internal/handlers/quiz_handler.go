package handlers

import (
	"encoding/json"
	"net/http"
	"time"

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
	Quantity        *int     `json:"quantity"`
	Context         string   `json:"context"`
	Difficulty      string   `json:"difficulty"`
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
	questionCount := 5
	if req.Quantity != nil {
		questionCount = *req.Quantity
	}
	if questionCount <= 0 || questionCount > 20 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "quantity must be between 1 and 20"})
		return
	}

	difficulty := req.Difficulty
	if difficulty != "" && difficulty != "easy" && difficulty != "medium" && difficulty != "hard" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "difficulty must be one of: easy, medium, hard"})
		return
	}

	quizResponse, err := h.aiService.GenerateQuiz(c.Request.Context(), userID, courseID, targetUnitIDs, services.GenerateQuizOptions{
		QuestionCount: questionCount,
		Context:       req.Context,
		Difficulty:    difficulty,
	})
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
	Quantity        *int     `json:"quantity"`
	Context         string   `json:"context"`
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
	flashcardCount := 10
	if req.Quantity != nil {
		flashcardCount = *req.Quantity
	}
	if flashcardCount <= 0 || flashcardCount > 20 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "quantity must be between 1 and 20"})
		return
	}

	flashcardsResponse, err := h.aiService.GenerateFlashcards(c.Request.Context(), userID, courseID, targetUnitIDs, services.GenerateFlashcardsOptions{
		FlashcardCount: flashcardCount,
		Context:        req.Context,
	})
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

type GeneratedFlashcardSetSummary struct {
	ID              uuid.UUID `json:"id"`
	Title           string    `json:"title"`
	FlashcardsCount int       `json:"flashcards_count"`
	CreatedAt       time.Time `json:"created_at"`
}

type GeneratedQuizSummary struct {
	ID             uuid.UUID `json:"id"`
	Title          string    `json:"title"`
	QuestionsCount int       `json:"questions_count"`
	CreatedAt      time.Time `json:"created_at"`
}

func (h *QuizHandler) ListGeneratedFlashcards(c *gin.Context) {
	courseIDStr := c.Param("courseId")
	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

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

	sets, err := h.aiService.ListGeneratedFlashcardSets(c.Request.Context(), userID, courseID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list generated flashcards", "details": err.Error()})
		return
	}

	out := make([]GeneratedFlashcardSetSummary, 0, len(sets))
	for _, s := range sets {
		var payload services.GeneratedFlashcardSetResponse
		_ = json.Unmarshal(s.FlashcardsData, &payload)
		out = append(out, GeneratedFlashcardSetSummary{
			ID:              s.ID,
			Title:           s.Title,
			FlashcardsCount: len(payload.Flashcards),
			CreatedAt:       s.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"flashcards": out})
}

func (h *QuizHandler) GetGeneratedFlashcardSet(c *gin.Context) {
	courseIDStr := c.Param("courseId")
	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	setIDStr := c.Param("setId")
	setID, err := uuid.Parse(setIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid flashcard set ID"})
		return
	}

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

	set, err := h.aiService.GetGeneratedFlashcardSet(c.Request.Context(), userID, courseID, setID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Flashcard set not found"})
		return
	}

	var resp services.GeneratedFlashcardSetResponse
	if err := json.Unmarshal(set.FlashcardsData, &resp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse flashcards data"})
		return
	}
	resp.ID = set.ID
	resp.Title = set.Title
	resp.SourceUnitIDs = set.SourceUnitIDs

	c.JSON(http.StatusOK, resp)
}

func (h *QuizHandler) DeleteGeneratedFlashcardSet(c *gin.Context) {
	courseIDStr := c.Param("courseId")
	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	setIDStr := c.Param("setId")
	setID, err := uuid.Parse(setIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid flashcard set ID"})
		return
	}

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

	if err := h.aiService.DeleteGeneratedFlashcardSet(c.Request.Context(), userID, courseID, setID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Flashcard set not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}

func (h *QuizHandler) ListGeneratedQuizzes(c *gin.Context) {
	courseIDStr := c.Param("courseId")
	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

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

	quizzes, err := h.aiService.ListGeneratedQuizzes(c.Request.Context(), userID, courseID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list generated quizzes", "details": err.Error()})
		return
	}

	out := make([]GeneratedQuizSummary, 0, len(quizzes))
	for _, q := range quizzes {
		var payload services.GeneratedQuizResponse
		_ = json.Unmarshal(q.QuizData, &payload)
		out = append(out, GeneratedQuizSummary{
			ID:             q.ID,
			Title:          q.Title,
			QuestionsCount: len(payload.Questions),
			CreatedAt:      q.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"quizzes": out})
}

func (h *QuizHandler) GetGeneratedQuiz(c *gin.Context) {
	courseIDStr := c.Param("courseId")
	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	quizIDStr := c.Param("quizId")
	quizID, err := uuid.Parse(quizIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid quiz ID"})
		return
	}

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

	quiz, err := h.aiService.GetGeneratedQuiz(c.Request.Context(), userID, courseID, quizID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quiz not found"})
		return
	}

	var resp services.GeneratedQuizResponse
	if err := json.Unmarshal(quiz.QuizData, &resp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse quiz data"})
		return
	}
	resp.ID = quiz.ID
	resp.Title = quiz.Title
	resp.SourceUnitIDs = quiz.SourceUnitIDs

	c.JSON(http.StatusOK, resp)
}

func (h *QuizHandler) DeleteGeneratedQuiz(c *gin.Context) {
	courseIDStr := c.Param("courseId")
	courseID, err := uuid.Parse(courseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	quizIDStr := c.Param("quizId")
	quizID, err := uuid.Parse(quizIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid quiz ID"})
		return
	}

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

	if err := h.aiService.DeleteGeneratedQuiz(c.Request.Context(), userID, courseID, quizID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quiz not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}
