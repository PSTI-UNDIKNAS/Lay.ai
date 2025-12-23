package store

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"lay.ai/backend/internal/models"

	"github.com/google/uuid"
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
		INSERT INTO flashcard_sets (learning_unit_id, title, flashcards_data, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	flashcardSet.CreatedAt = now
	flashcardSet.UpdatedAt = now

	if flashcardSet.FlashcardsData == nil {
		flashcardSet.FlashcardsData = []byte("[]")
	}

	row := s.db.QueryRow(
		context.Background(),
		query,
		flashcardSet.LearningUnitID,
		flashcardSet.Title,
		flashcardSet.FlashcardsData,
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
		SELECT id, learning_unit_id, title, flashcards_data, created_at, updated_at
		FROM flashcard_sets
		WHERE id = $1
	`

	var flashcardSet models.FlashcardSet
	row := s.db.QueryRow(context.Background(), query, setID)

	err := row.Scan(
		&flashcardSet.ID,
		&flashcardSet.LearningUnitID,
		&flashcardSet.Title,
		&flashcardSet.FlashcardsData,
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

// UpdateFlashcardSet updates a flashcard set in the database
func (s *QuizStore) UpdateFlashcardSet(setID string, updates map[string]interface{}) (*models.FlashcardSet, error) {
	if len(updates) == 0 {
		return s.GetFlashcardSetByID(setID)
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

	// Add the set ID for the WHERE clause
	args = append(args, setID)

	query := fmt.Sprintf(`
		UPDATE flashcard_sets
		SET %s
		WHERE id = $%d
		RETURNING id, learning_unit_id, title, flashcards_data, created_at, updated_at
	`, strings.Join(setParts, ", "), argIndex)

	var flashcardSet models.FlashcardSet
	row := s.db.QueryRow(context.Background(), query, args...)

	err := row.Scan(
		&flashcardSet.ID,
		&flashcardSet.LearningUnitID,
		&flashcardSet.Title,
		&flashcardSet.FlashcardsData,
		&flashcardSet.CreatedAt,
		&flashcardSet.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("flashcard set not found")
		}
		return nil, fmt.Errorf("failed to update flashcard set: %w", err)
	}

	return &flashcardSet, nil
}

// AddFlashcardToSet adds a new flashcard to the flashcard set's JSONB data atomically
func (s *QuizStore) AddFlashcardToSet(setID string, flashcard *models.Flashcard) error {
	cardJSON, err := json.Marshal(flashcard)
	if err != nil {
		return fmt.Errorf("failed to marshal flashcard: %w", err)
	}

	// Wrap in array for concatenation
	cardArrayJSON := fmt.Sprintf("[%s]", string(cardJSON))

	query := `
		UPDATE flashcard_sets 
		SET flashcards_data = flashcards_data || $1::jsonb, updated_at = $3
		WHERE id = $2
	`

	result, err := s.db.Exec(context.Background(), query, cardArrayJSON, setID, time.Now())
	if err != nil {
		return fmt.Errorf("failed to add flashcard to set: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("flashcard set not found")
	}

	return nil
}

func (s *QuizStore) CountQuizzesByLearningUnitIDs(unitIDs []uuid.UUID) (map[uuid.UUID]int, error) {
	if len(unitIDs) == 0 {
		return map[uuid.UUID]int{}, nil
	}

	query := `
		SELECT learning_unit_id, COUNT(*)
		FROM quizzes
		WHERE learning_unit_id = ANY($1)
		GROUP BY learning_unit_id
	`

	rows, err := s.db.Query(context.Background(), query, unitIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to count quizzes: %w", err)
	}
	defer rows.Close()

	counts := make(map[uuid.UUID]int, len(unitIDs))
	for rows.Next() {
		var unitID uuid.UUID
		var count int
		if err := rows.Scan(&unitID, &count); err != nil {
			return nil, fmt.Errorf("failed to scan quiz count: %w", err)
		}
		counts[unitID] = count
	}

	return counts, nil
}

func (s *QuizStore) NextQuizAttemptNumber(ctx context.Context, quizID uuid.UUID, studentID uuid.UUID) (int, error) {
	var next int
	err := s.db.QueryRow(
		ctx,
		`SELECT COALESCE(MAX(attempt_no), 0) + 1 FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2`,
		quizID,
		studentID,
	).Scan(&next)
	if err != nil {
		return 0, fmt.Errorf("failed to get next quiz attempt number: %w", err)
	}
	return next, nil
}

func (s *QuizStore) CreateQuizAttempt(ctx context.Context, attempt *models.QuizAttempt) (*models.QuizAttempt, error) {
	if attempt == nil {
		return nil, fmt.Errorf("attempt is required")
	}
	if attempt.QuizID == uuid.Nil || attempt.StudentID == uuid.Nil {
		return nil, fmt.Errorf("quiz_id and student_id are required")
	}

	nextAttemptNo, err := s.NextQuizAttemptNumber(ctx, attempt.QuizID, attempt.StudentID)
	if err != nil {
		return nil, err
	}

	query := `
		INSERT INTO quiz_attempts (quiz_id, student_id, attempt_no, answers, score, max_score)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`

	attempt.AttemptNo = nextAttemptNo

	err = s.db.QueryRow(
		ctx,
		query,
		attempt.QuizID,
		attempt.StudentID,
		attempt.AttemptNo,
		attempt.Answers,
		attempt.Score,
		attempt.MaxScore,
	).Scan(&attempt.ID, &attempt.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create quiz attempt: %w", err)
	}

	return attempt, nil
}

func (s *QuizStore) GetQuizAttemptsByQuizID(ctx context.Context, quizID uuid.UUID, limit, offset int) ([]*models.QuizAttempt, error) {
	var query strings.Builder
	var args []interface{}
	argIndex := 1

	query.WriteString(`
		SELECT id, quiz_id, student_id, attempt_no, NULL::jsonb AS answers, score, max_score, created_at
		FROM quiz_attempts
		WHERE quiz_id = $1
		ORDER BY created_at DESC
	`)
	args = append(args, quizID)
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

	rows, err := s.db.Query(ctx, query.String(), args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get quiz attempts: %w", err)
	}
	defer rows.Close()

	var attempts []*models.QuizAttempt
	for rows.Next() {
		var a models.QuizAttempt
		if err := rows.Scan(
			&a.ID,
			&a.QuizID,
			&a.StudentID,
			&a.AttemptNo,
			&a.Answers,
			&a.Score,
			&a.MaxScore,
			&a.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan quiz attempt: %w", err)
		}
		attempts = append(attempts, &a)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate quiz attempts: %w", err)
	}

	return attempts, nil
}
