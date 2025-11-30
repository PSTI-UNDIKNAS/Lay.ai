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
