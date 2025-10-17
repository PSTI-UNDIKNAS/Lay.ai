package store

import (
	"context"
	"fmt"
	"strings"
	"time"

	"lay.ai/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// QuizStore handles database operations for quizzes and flashcard sets
type QuizStore struct {
	db *pgxpool.Pool
}

// NewQuizStore creates a new QuizStore
func NewQuizStore(db *pgxpool.Pool) *QuizStore {
	return &QuizStore{
		db: db,
	}
}

// CreateQuiz saves a new quiz to the database
func (s *QuizStore) CreateQuiz(quiz *models.Quiz) (*models.Quiz, error) {
	query := `
		INSERT INTO quizzes (learning_unit_id, title, quiz_data, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	quiz.CreatedAt = now
	quiz.UpdatedAt = now

	row := s.db.QueryRow(
		context.Background(),
		query,
		quiz.LearningUnitID,
		quiz.Title,
		quiz.QuizData,
		quiz.CreatedAt,
		quiz.UpdatedAt,
	)

	err := row.Scan(&quiz.ID, &quiz.CreatedAt, &quiz.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create quiz: %w", err)
	}

	return quiz, nil
}

// GetQuizByID retrieves a quiz by its ID
func (s *QuizStore) GetQuizByID(quizID string) (*models.Quiz, error) {
	query := `
		SELECT id, learning_unit_id, title, quiz_data, created_at, updated_at
		FROM quizzes
		WHERE id = $1
	`

	var quiz models.Quiz
	row := s.db.QueryRow(context.Background(), query, quizID)

	err := row.Scan(
		&quiz.ID,
		&quiz.LearningUnitID,
		&quiz.Title,
		&quiz.QuizData,
		&quiz.CreatedAt,
		&quiz.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("quiz not found")
		}
		return nil, fmt.Errorf("failed to get quiz: %w", err)
	}

	return &quiz, nil
}

// GetQuizzesByLearningUnitID retrieves quizzes for a specific learning unit
func (s *QuizStore) GetQuizzesByLearningUnitID(unitID string, limit, offset int) ([]*models.Quiz, error) {
	var query strings.Builder
	var args []interface{}
	argIndex := 1

	query.WriteString(`
		SELECT id, learning_unit_id, title, quiz_data, created_at, updated_at
		FROM quizzes
		WHERE learning_unit_id = $1
		ORDER BY created_at DESC
	`)
	args = append(args, unitID)
	argIndex++

	if limit > 0 {
		query.WriteString(fmt.Sprintf(" LIMIT $%d", argIndex))
		args = append(args, limit)
		argIndex++
	}

	if offset > 0 {
		query.WriteString(fmt.Sprintf(" OFFSET $%d", argIndex))
		args = append(args, offset)
	}

	rows, err := s.db.Query(context.Background(), query.String(), args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get quizzes: %w", err)
	}
	defer rows.Close()

	var quizzes []*models.Quiz
	for rows.Next() {
		var quiz models.Quiz
		err := rows.Scan(
			&quiz.ID,
			&quiz.LearningUnitID,
			&quiz.Title,
			&quiz.QuizData,
			&quiz.CreatedAt,
			&quiz.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan quiz: %w", err)
		}

		quizzes = append(quizzes, &quiz)
	}

	return quizzes, nil
}

// UpdateQuiz updates a quiz in the database
func (s *QuizStore) UpdateQuiz(quizID string, updates map[string]interface{}) (*models.Quiz, error) {
	if len(updates) == 0 {
		return s.GetQuizByID(quizID)
	}

	var setParts []string
	var args []interface{}
	argIndex := 1

	for field, value := range updates {
		setParts = append(setParts, fmt.Sprintf("%s = $%d", field, argIndex))
		args = append(args, value)
		argIndex++
	}

	// Always update the updated_at timestamp
	setParts = append(setParts, fmt.Sprintf("updated_at = $%d", argIndex))
	args = append(args, time.Now())
	argIndex++

	// Add the quiz ID for the WHERE clause
	args = append(args, quizID)

	query := fmt.Sprintf(`
		UPDATE quizzes
		SET %s
		WHERE id = $%d
		RETURNING id, learning_unit_id, title, quiz_data, created_at, updated_at
	`, strings.Join(setParts, ", "), argIndex)

	var quiz models.Quiz
	row := s.db.QueryRow(context.Background(), query, args...)

	err := row.Scan(
		&quiz.ID,
		&quiz.LearningUnitID,
		&quiz.Title,
		&quiz.QuizData,
		&quiz.CreatedAt,
		&quiz.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("quiz not found")
		}
		return nil, fmt.Errorf("failed to update quiz: %w", err)
	}

	return &quiz, nil
}

// DeleteQuiz deletes a quiz from the database
func (s *QuizStore) DeleteQuiz(quizID string) error {
	query := `DELETE FROM quizzes WHERE id = $1`

	result, err := s.db.Exec(context.Background(), query, quizID)
	if err != nil {
		return fmt.Errorf("failed to delete quiz: %w", err)
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("quiz not found")
	}

	return nil
}

// CreateFlashcardSet saves a new flashcard set to the database
func (s *QuizStore) CreateFlashcardSet(flashcardSet *models.FlashcardSet) (*models.FlashcardSet, error) {
	query := `
		INSERT INTO flashcard_sets (learning_unit_id, title, created_at, updated_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	flashcardSet.CreatedAt = now
	flashcardSet.UpdatedAt = now

	row := s.db.QueryRow(
		context.Background(),
		query,
		flashcardSet.LearningUnitID,
		flashcardSet.Title,
		flashcardSet.CreatedAt,
		flashcardSet.UpdatedAt,
	)

	err := row.Scan(&flashcardSet.ID, &flashcardSet.CreatedAt, &flashcardSet.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create flashcard set: %w", err)
	}

	return flashcardSet, nil
}

// GetFlashcardSetByID retrieves a flashcard set by its ID
func (s *QuizStore) GetFlashcardSetByID(setID string) (*models.FlashcardSet, error) {
	query := `
		SELECT id, learning_unit_id, title, created_at, updated_at
		FROM flashcard_sets
		WHERE id = $1
	`

	var flashcardSet models.FlashcardSet
	row := s.db.QueryRow(context.Background(), query, setID)

	err := row.Scan(
		&flashcardSet.ID,
		&flashcardSet.LearningUnitID,
		&flashcardSet.Title,
		&flashcardSet.CreatedAt,
		&flashcardSet.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("flashcard set not found")
		}
		return nil, fmt.Errorf("failed to get flashcard set: %w", err)
	}

	return &flashcardSet, nil
}

// CreateFlashcard saves a new flashcard to the database
func (s *QuizStore) CreateFlashcard(flashcard *models.Flashcard) (*models.Flashcard, error) {
	query := `
		INSERT INTO flashcards (set_id, front_text, back_text, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	flashcard.CreatedAt = now
	flashcard.UpdatedAt = now

	row := s.db.QueryRow(
		context.Background(),
		query,
		flashcard.SetID,
		flashcard.FrontText,
		flashcard.BackText,
		flashcard.CreatedAt,
		flashcard.UpdatedAt,
	)

	err := row.Scan(&flashcard.ID, &flashcard.CreatedAt, &flashcard.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create flashcard: %w", err)
	}

	return flashcard, nil
}

// GetFlashcardsBySetID retrieves flashcards for a specific set
func (s *QuizStore) GetFlashcardsBySetID(setID string) ([]*models.Flashcard, error) {
	query := `
		SELECT id, set_id, front_text, back_text, created_at, updated_at
		FROM flashcards
		WHERE set_id = $1
		ORDER BY created_at ASC
	`

	rows, err := s.db.Query(context.Background(), query, setID)
	if err != nil {
		return nil, fmt.Errorf("failed to get flashcards: %w", err)
	}
	defer rows.Close()

	var flashcards []*models.Flashcard
	for rows.Next() {
		var flashcard models.Flashcard
		err := rows.Scan(
			&flashcard.ID,
			&flashcard.SetID,
			&flashcard.FrontText,
			&flashcard.BackText,
			&flashcard.CreatedAt,
			&flashcard.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan flashcard: %w", err)
		}
		flashcards = append(flashcards, &flashcard)
	}

	return flashcards, nil
}