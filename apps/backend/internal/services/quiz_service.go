package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"lay.ai/backend/internal/models"
	"lay.ai/backend/internal/store"
)

// QuizService handles quiz-related business logic
type QuizService struct {
	quizStore *store.QuizStore
}

// NewQuizService creates a new QuizService
func NewQuizService(quizStore *store.QuizStore) *QuizService {
	return &QuizService{
		quizStore: quizStore,
	}
}

// CreateQuiz handles quiz creation business logic
func (s *QuizService) CreateQuiz(learningUnitID, title string, quizData models.QuizData) (*models.Quiz, error) {
	// Validate required fields
	if learningUnitID == "" {
		return nil, fmt.Errorf("learning unit ID is required")
	}
	if title == "" {
		return nil, fmt.Errorf("quiz title is required")
	}

	// Convert QuizData to json.RawMessage
	quizDataJSON, err := json.Marshal(quizData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal quiz data: %w", err)
	}

	// Create quiz object
	quiz := &models.Quiz{
		LearningUnitID: uuid.MustParse(learningUnitID),
		Title:          title,
		QuizData:       quizDataJSON,
	}

	// Save to database
	return s.quizStore.CreateQuiz(quiz)
}

// GetQuizByID retrieves a quiz by its ID
func (s *QuizService) GetQuizByID(quizID string) (*models.Quiz, error) {
	if quizID == "" {
		return nil, fmt.Errorf("quiz ID is required")
	}

	return s.quizStore.GetQuizByID(quizID)
}

// GetQuizzesByLearningUnitID retrieves quizzes for a specific learning unit
func (s *QuizService) GetQuizzesByLearningUnitID(learningUnitID string, limit, offset int) ([]*models.Quiz, error) {
	if learningUnitID == "" {
		return nil, fmt.Errorf("learning unit ID is required")
	}

	// Set default limit if not provided
	if limit <= 0 {
		limit = 50
	}

	return s.quizStore.GetQuizzesByLearningUnitID(learningUnitID, limit, offset)
}

// UpdateQuiz handles quiz update business logic
func (s *QuizService) UpdateQuiz(quizID string, updates map[string]interface{}) (*models.Quiz, error) {
	if quizID == "" {
		return nil, fmt.Errorf("quiz ID is required")
	}

	// Validate updates
	if title, exists := updates["title"]; exists {
		if titleStr, ok := title.(string); ok && titleStr == "" {
			return nil, fmt.Errorf("quiz title cannot be empty")
		}
	}

	return s.quizStore.UpdateQuiz(quizID, updates)
}

// DeleteQuiz handles quiz deletion business logic
func (s *QuizService) DeleteQuiz(quizID string) error {
	if quizID == "" {
		return fmt.Errorf("quiz ID is required")
	}

	// Check if quiz exists before deletion
	_, err := s.quizStore.GetQuizByID(quizID)
	if err != nil {
		return fmt.Errorf("quiz not found: %w", err)
	}

	return s.quizStore.DeleteQuiz(quizID)
}

func (s *QuizService) SubmitQuizAttempt(
	ctx context.Context,
	quizID uuid.UUID,
	studentID uuid.UUID,
	answers []models.QuizSubmissionAnswer,
) (*models.QuizAttempt, error) {
	quiz, err := s.quizStore.GetQuizByID(quizID.String())
	if err != nil {
		return nil, err
	}

	var quizData models.QuizData
	if err := json.Unmarshal(quiz.QuizData, &quizData); err != nil {
		return nil, fmt.Errorf("invalid quiz data: %w", err)
	}

	questionsByID := make(map[string]models.QuizQuestion, len(quizData.Questions))
	maxScore := 0
	for _, q := range quizData.Questions {
		questionsByID[q.ID] = q
		points := q.Points
		if points <= 0 {
			points = 1
		}
		maxScore += points
	}

	score := 0
	for _, a := range answers {
		q, ok := questionsByID[a.QuestionID]
		if !ok {
			continue
		}
		if strings.TrimSpace(a.Answer) == strings.TrimSpace(q.Answer) {
			points := q.Points
			if points <= 0 {
				points = 1
			}
			score += points
		}
	}

	answersJSON, err := json.Marshal(answers)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal answers: %w", err)
	}

	attempt := &models.QuizAttempt{
		QuizID:    quizID,
		StudentID: studentID,
		Answers:   answersJSON,
		Score:     score,
		MaxScore:  maxScore,
	}

	return s.quizStore.CreateQuizAttempt(ctx, attempt)
}

func (s *QuizService) GetLatestQuizAttemptByStudentAndQuiz(ctx context.Context, quizID uuid.UUID, studentID uuid.UUID) (*models.QuizAttempt, error) {
	return s.quizStore.GetLatestQuizAttemptByStudentAndQuiz(ctx, quizID, studentID)
}

func (s *QuizService) GetLatestQuizAttemptsByStudentAndUnit(ctx context.Context, unitID uuid.UUID, studentID uuid.UUID) ([]*models.QuizAttempt, error) {
	return s.quizStore.GetLatestQuizAttemptsByStudentAndUnit(ctx, unitID, studentID)
}

// CreateFlashcardSet handles flashcard set creation business logic
func (s *QuizService) CreateFlashcardSet(learningUnitID, title string) (*models.FlashcardSet, error) {
	// Validate required fields
	if learningUnitID == "" {
		return nil, fmt.Errorf("learning unit ID is required")
	}
	if title == "" {
		return nil, fmt.Errorf("flashcard set title is required")
	}

	// Create flashcard set object
	flashcardSet := &models.FlashcardSet{
		LearningUnitID: uuid.MustParse(learningUnitID),
		Title:          title,
	}

	// Save to database
	return s.quizStore.CreateFlashcardSet(flashcardSet)
}

// GetFlashcardSetByID retrieves a flashcard set by its ID
func (s *QuizService) GetFlashcardSetByID(setID string) (*models.FlashcardSet, error) {
	if setID == "" {
		return nil, fmt.Errorf("flashcard set ID is required")
	}

	return s.quizStore.GetFlashcardSetByID(setID)
}

// CreateFlashcard handles flashcard creation business logic
func (s *QuizService) CreateFlashcard(setID, frontText, backText string) (*models.Flashcard, error) {
	// Validate required fields
	if setID == "" {
		return nil, fmt.Errorf("flashcard set ID is required")
	}
	if frontText == "" {
		return nil, fmt.Errorf("flashcard front text is required")
	}
	if backText == "" {
		return nil, fmt.Errorf("flashcard back text is required")
	}

	// Create flashcard object
	now := time.Now()
	flashcard := &models.Flashcard{
		ID:        uuid.New(),
		SetID:     uuid.MustParse(setID),
		FrontText: frontText,
		BackText:  backText,
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Save to database
	err := s.quizStore.AddFlashcardToSet(setID, flashcard)
	if err != nil {
		return nil, err
	}

	return flashcard, nil
}

// GetFlashcardsBySetID retrieves flashcards for a specific set
func (s *QuizService) GetFlashcardsBySetID(setID string) ([]*models.Flashcard, error) {
	if setID == "" {
		return nil, fmt.Errorf("flashcard set ID is required")
	}

	set, err := s.quizStore.GetFlashcardSetByID(setID)
	if err != nil {
		return nil, err
	}

	var flashcards []*models.Flashcard
	if len(set.FlashcardsData) > 0 && string(set.FlashcardsData) != "null" {
		if err := json.Unmarshal(set.FlashcardsData, &flashcards); err != nil {
			return nil, fmt.Errorf("failed to unmarshal flashcards: %w", err)
		}
	}

	if flashcards == nil {
		flashcards = []*models.Flashcard{}
	}

	return flashcards, nil
}
