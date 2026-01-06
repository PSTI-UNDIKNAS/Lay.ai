package store

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"lay.ai/backend/internal/models"
)

// GeneratedContentStore handles database operations for generated content
type GeneratedContentStore struct {
	db *pgxpool.Pool
}

// NewGeneratedContentStore creates a new GeneratedContentStore
func NewGeneratedContentStore(db *pgxpool.Pool) *GeneratedContentStore {
	return &GeneratedContentStore{db: db}
}

// CreateGeneratedQuiz creates a new generated quiz record
func (s *GeneratedContentStore) CreateGeneratedQuiz(ctx context.Context, quiz *models.GeneratedQuiz) error {
	query := `
		INSERT INTO generated_quizzes (id, user_id, course_id, title, quiz_data, source_unit_ids, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		RETURNING created_at, updated_at
	`
	if quiz.ID == uuid.Nil {
		quiz.ID = uuid.New()
	}

	return s.db.QueryRow(ctx, query,
		quiz.ID,
		quiz.UserID,
		quiz.CourseID,
		quiz.Title,
		quiz.QuizData,
		quiz.SourceUnitIDs,
	).Scan(&quiz.CreatedAt, &quiz.UpdatedAt)
}

// GetGeneratedQuizByID retrieves a generated quiz by ID
func (s *GeneratedContentStore) GetGeneratedQuizByID(ctx context.Context, id uuid.UUID) (*models.GeneratedQuiz, error) {
	query := `
		SELECT id, user_id, course_id, title, quiz_data, source_unit_ids, created_at, updated_at
		FROM generated_quizzes
		WHERE id = $1
	`
	var quiz models.GeneratedQuiz
	err := s.db.QueryRow(ctx, query, id).Scan(
		&quiz.ID,
		&quiz.UserID,
		&quiz.CourseID,
		&quiz.Title,
		&quiz.QuizData,
		&quiz.SourceUnitIDs,
		&quiz.CreatedAt,
		&quiz.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get generated quiz: %w", err)
	}
	return &quiz, nil
}

// GetGeneratedQuizzesByUserID retrieves all generated quizzes for a user
func (s *GeneratedContentStore) GetGeneratedQuizzesByUserID(ctx context.Context, userID uuid.UUID) ([]models.GeneratedQuiz, error) {
	query := `
		SELECT id, user_id, course_id, title, quiz_data, source_unit_ids, created_at, updated_at
		FROM generated_quizzes
		WHERE user_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query generated quizzes: %w", err)
	}
	defer rows.Close()

	var quizzes []models.GeneratedQuiz
	for rows.Next() {
		var q models.GeneratedQuiz
		if err := rows.Scan(&q.ID, &q.UserID, &q.CourseID, &q.Title, &q.QuizData, &q.SourceUnitIDs, &q.CreatedAt, &q.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan generated quiz: %w", err)
		}
		quizzes = append(quizzes, q)
	}
	return quizzes, nil
}

func (s *GeneratedContentStore) GetGeneratedQuizzesByUserAndCourseID(ctx context.Context, userID uuid.UUID, courseID uuid.UUID) ([]models.GeneratedQuiz, error) {
	query := `
		SELECT id, user_id, course_id, title, quiz_data, source_unit_ids, created_at, updated_at
		FROM generated_quizzes
		WHERE user_id = $1 AND course_id = $2
		ORDER BY created_at DESC
	`
	rows, err := s.db.Query(ctx, query, userID, courseID)
	if err != nil {
		return nil, fmt.Errorf("failed to query generated quizzes: %w", err)
	}
	defer rows.Close()

	var quizzes []models.GeneratedQuiz
	for rows.Next() {
		var q models.GeneratedQuiz
		if err := rows.Scan(&q.ID, &q.UserID, &q.CourseID, &q.Title, &q.QuizData, &q.SourceUnitIDs, &q.CreatedAt, &q.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan generated quiz: %w", err)
		}
		quizzes = append(quizzes, q)
	}
	return quizzes, nil
}

func (s *GeneratedContentStore) DeleteGeneratedQuiz(ctx context.Context, id uuid.UUID, userID uuid.UUID, courseID uuid.UUID) error {
	cmd, err := s.db.Exec(ctx, `
		DELETE FROM generated_quizzes
		WHERE id = $1 AND user_id = $2 AND course_id = $3
	`, id, userID, courseID)
	if err != nil {
		return fmt.Errorf("failed to delete generated quiz: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return fmt.Errorf("generated quiz not found")
	}
	return nil
}

// CreateGeneratedFlashcardSet creates a new generated flashcard set record
func (s *GeneratedContentStore) CreateGeneratedFlashcardSet(ctx context.Context, set *models.GeneratedFlashcardSet) error {
	query := `
		INSERT INTO generated_flashcard_sets (id, user_id, course_id, title, flashcards_data, source_unit_ids, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
		RETURNING created_at, updated_at
	`
	if set.ID == uuid.Nil {
		set.ID = uuid.New()
	}

	return s.db.QueryRow(ctx, query,
		set.ID,
		set.UserID,
		set.CourseID,
		set.Title,
		set.FlashcardsData,
		set.SourceUnitIDs,
	).Scan(&set.CreatedAt, &set.UpdatedAt)
}

// GetGeneratedFlashcardSetByID retrieves a generated flashcard set by ID
func (s *GeneratedContentStore) GetGeneratedFlashcardSetByID(ctx context.Context, id uuid.UUID) (*models.GeneratedFlashcardSet, error) {
	query := `
		SELECT id, user_id, course_id, title, flashcards_data, source_unit_ids, created_at, updated_at
		FROM generated_flashcard_sets
		WHERE id = $1
	`
	var set models.GeneratedFlashcardSet
	err := s.db.QueryRow(ctx, query, id).Scan(
		&set.ID,
		&set.UserID,
		&set.CourseID,
		&set.Title,
		&set.FlashcardsData,
		&set.SourceUnitIDs,
		&set.CreatedAt,
		&set.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get generated flashcard set: %w", err)
	}
	return &set, nil
}

// GetGeneratedFlashcardSetsByUserID retrieves all generated flashcard sets for a user
func (s *GeneratedContentStore) GetGeneratedFlashcardSetsByUserID(ctx context.Context, userID uuid.UUID) ([]models.GeneratedFlashcardSet, error) {
	query := `
		SELECT id, user_id, course_id, title, flashcards_data, source_unit_ids, created_at, updated_at
		FROM generated_flashcard_sets
		WHERE user_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query generated flashcard sets: %w", err)
	}
	defer rows.Close()

	var sets []models.GeneratedFlashcardSet
	for rows.Next() {
		var s models.GeneratedFlashcardSet
		if err := rows.Scan(&s.ID, &s.UserID, &s.CourseID, &s.Title, &s.FlashcardsData, &s.SourceUnitIDs, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan generated flashcard set: %w", err)
		}
		sets = append(sets, s)
	}
	return sets, nil
}

func (s *GeneratedContentStore) GetGeneratedFlashcardSetsByUserAndCourseID(ctx context.Context, userID uuid.UUID, courseID uuid.UUID) ([]models.GeneratedFlashcardSet, error) {
	query := `
		SELECT id, user_id, course_id, title, flashcards_data, source_unit_ids, created_at, updated_at
		FROM generated_flashcard_sets
		WHERE user_id = $1 AND course_id = $2
		ORDER BY created_at DESC
	`
	rows, err := s.db.Query(ctx, query, userID, courseID)
	if err != nil {
		return nil, fmt.Errorf("failed to query generated flashcard sets: %w", err)
	}
	defer rows.Close()

	var sets []models.GeneratedFlashcardSet
	for rows.Next() {
		var s models.GeneratedFlashcardSet
		if err := rows.Scan(&s.ID, &s.UserID, &s.CourseID, &s.Title, &s.FlashcardsData, &s.SourceUnitIDs, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan generated flashcard set: %w", err)
		}
		sets = append(sets, s)
	}
	return sets, nil
}

func (s *GeneratedContentStore) DeleteGeneratedFlashcardSet(ctx context.Context, id uuid.UUID, userID uuid.UUID, courseID uuid.UUID) error {
	cmd, err := s.db.Exec(ctx, `
		DELETE FROM generated_flashcard_sets
		WHERE id = $1 AND user_id = $2 AND course_id = $3
	`, id, userID, courseID)
	if err != nil {
		return fmt.Errorf("failed to delete generated flashcard set: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return fmt.Errorf("generated flashcard set not found")
	}
	return nil
}
