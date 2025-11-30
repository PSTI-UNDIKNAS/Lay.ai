package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Quiz represents a quiz in the system
type Quiz struct {
	ID               uuid.UUID       `json:"id" db:"id"`
	LearningUnitID   uuid.UUID       `json:"learning_unit_id" db:"learning_unit_id"`
	Title            string          `json:"title" db:"title"`
	QuizData         json.RawMessage `json:"quiz_data" db:"quiz_data"`
	CreatedAt        time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at" db:"updated_at"`
}

// QuizQuestion represents a single quiz question
type QuizQuestion struct {
	ID       string   `json:"id"`
	Question string   `json:"question"`
	Options  []string `json:"options"`
	Answer   string   `json:"answer"`
	Points   int      `json:"points"`
}

// QuizData represents the structure of quiz data stored in JSONB
type QuizData struct {
	Questions []QuizQuestion `json:"questions"`
	TimeLimit int            `json:"time_limit"` // in minutes
}

// CreateQuizRequest represents the request payload for creating a quiz
type CreateQuizRequest struct {
	Title     string    `json:"title" binding:"required"`
	QuizData  QuizData  `json:"quiz_data" binding:"required"`
}

// UpdateQuizRequest represents the request payload for updating a quiz
type UpdateQuizRequest struct {
	Title     string    `json:"title"`
	QuizData  QuizData  `json:"quiz_data"`
}

// QuizResponse represents the response for quiz operations
type QuizResponse struct {
	ID               uuid.UUID `json:"id"`
	LearningUnitID   uuid.UUID `json:"learning_unit_id"`
	Title            string    `json:"title"`
	QuizData         QuizData  `json:"quiz_data"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// GetQuizzesResponse represents the response for getting multiple quizzes
type GetQuizzesResponse struct {
	Quizzes []QuizResponse `json:"quizzes"`
	Total   int            `json:"total"`
}

// FlashcardSet represents a flashcard set in the system
type FlashcardSet struct {
	ID             uuid.UUID       `json:"id" db:"id"`
	LearningUnitID uuid.UUID       `json:"learning_unit_id" db:"learning_unit_id"`
	Title          string          `json:"title" db:"title"`
	FlashcardsData json.RawMessage `json:"flashcards_data" db:"flashcards_data"`
	CreatedAt      time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at" db:"updated_at"`
}

// Flashcard represents a flashcard in the system
type Flashcard struct {
	ID        uuid.UUID `json:"id"`
	SetID     uuid.UUID `json:"set_id,omitempty"` // Optional in JSONB as it's redundant
	FrontText string    `json:"front_text"`
	BackText  string    `json:"back_text"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CreateFlashcardSetRequest represents the request payload for creating a flashcard set
type CreateFlashcardSetRequest struct {
	Title string `json:"title" binding:"required"`
}

// CreateFlashcardRequest represents the request payload for creating a flashcard
type CreateFlashcardRequest struct {
	FrontText string `json:"front_text" binding:"required"`
	BackText  string `json:"back_text" binding:"required"`
}

// FlashcardSetResponse represents the response for flashcard set operations
type FlashcardSetResponse struct {
	ID               uuid.UUID `json:"id"`
	LearningUnitID   uuid.UUID `json:"learning_unit_id"`
	Title            string    `json:"title"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// FlashcardResponse represents the response for flashcard operations
type FlashcardResponse struct {
	ID        uuid.UUID `json:"id"`
	SetID     uuid.UUID `json:"set_id"`
	FrontText string    `json:"front_text"`
	BackText  string    `json:"back_text"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}