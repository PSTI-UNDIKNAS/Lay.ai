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

// SubmissionStore handles database operations for submissions
type SubmissionStore struct {
	db *pgxpool.Pool
}

// NewSubmissionStore creates a new SubmissionStore
func NewSubmissionStore(db *pgxpool.Pool) *SubmissionStore {
	return &SubmissionStore{
		db: db,
	}
}

// CreateSubmission saves a new submission to the database
func (s *SubmissionStore) CreateSubmission(submission *models.Submission) (*models.Submission, error) {
	query := `
		INSERT INTO submissions (assignment_id, student_id, file_path, grade, feedback, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	submission.CreatedAt = now
	submission.UpdatedAt = now

	row := s.db.QueryRow(
		context.Background(),
		query,
		submission.AssignmentID,
		submission.StudentID,
		submission.FilePath,
		submission.Grade,
		submission.Feedback,
		submission.CreatedAt,
		submission.UpdatedAt,
	)

	err := row.Scan(&submission.ID, &submission.CreatedAt, &submission.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create submission: %w", err)
	}

	return submission, nil
}

// GetSubmissionByID retrieves a submission by its ID
func (s *SubmissionStore) GetSubmissionByID(submissionID string) (*models.Submission, error) {
	query := `
		SELECT id, assignment_id, student_id, file_path, grade, feedback, created_at, updated_at
		FROM submissions
		WHERE id = $1
	`

	var submission models.Submission
	row := s.db.QueryRow(context.Background(), query, submissionID)

	err := row.Scan(
		&submission.ID,
		&submission.AssignmentID,
		&submission.StudentID,
		&submission.FilePath,
		&submission.Grade,
		&submission.Feedback,
		&submission.CreatedAt,
		&submission.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("submission not found")
		}
		return nil, fmt.Errorf("failed to get submission: %w", err)
	}

	return &submission, nil
}

// GetSubmissions retrieves submissions with optional filtering
func (s *SubmissionStore) GetSubmissions(assignmentID, studentID *string, limit, offset int) ([]*models.Submission, error) {
	var query strings.Builder
	var args []interface{}
	argIndex := 1

	query.WriteString(`
		SELECT id, assignment_id, student_id, file_path, grade, feedback, created_at, updated_at
		FROM submissions
		WHERE 1=1
	`)

	if assignmentID != nil {
		query.WriteString(fmt.Sprintf(" AND assignment_id = $%d", argIndex))
		args = append(args, *assignmentID)
		argIndex++
	}

	if studentID != nil {
		query.WriteString(fmt.Sprintf(" AND student_id = $%d", argIndex))
		args = append(args, *studentID)
		argIndex++
	}

	query.WriteString(" ORDER BY created_at DESC")

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
		return nil, fmt.Errorf("failed to get submissions: %w", err)
	}
	defer rows.Close()

	var submissions []*models.Submission
	for rows.Next() {
		var submission models.Submission
		err := rows.Scan(
			&submission.ID,
			&submission.AssignmentID,
			&submission.StudentID,
			&submission.FilePath,
			&submission.Grade,
			&submission.Feedback,
			&submission.CreatedAt,
			&submission.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan submission: %w", err)
		}
		submissions = append(submissions, &submission)
	}

	return submissions, nil
}

func (s *SubmissionStore) GetSubmissionsByStudentAndUnit(studentID, unitID string) ([]*models.Submission, error) {
	query := `
		SELECT s.id, s.assignment_id, s.student_id, s.file_path, s.grade, s.feedback, s.created_at, s.updated_at
		FROM submissions s
		JOIN assignments a ON a.id = s.assignment_id
		WHERE s.student_id = $1 AND a.learning_unit_id = $2
		ORDER BY s.created_at DESC
	`

	rows, err := s.db.Query(context.Background(), query, studentID, unitID)
	if err != nil {
		return nil, fmt.Errorf("failed to get submissions: %w", err)
	}
	defer rows.Close()

	var submissions []*models.Submission
	for rows.Next() {
		var submission models.Submission
		err := rows.Scan(
			&submission.ID,
			&submission.AssignmentID,
			&submission.StudentID,
			&submission.FilePath,
			&submission.Grade,
			&submission.Feedback,
			&submission.CreatedAt,
			&submission.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan submission: %w", err)
		}
		submissions = append(submissions, &submission)
	}

	return submissions, nil
}

// UpdateSubmission updates a submission in the database
func (s *SubmissionStore) UpdateSubmission(submissionID string, updates map[string]interface{}) (*models.Submission, error) {
	if len(updates) == 0 {
		return s.GetSubmissionByID(submissionID)
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

	// Add the submission ID for the WHERE clause
	args = append(args, submissionID)

	query := fmt.Sprintf(`
		UPDATE submissions
		SET %s
		WHERE id = $%d
		RETURNING id, assignment_id, student_id, file_path, grade, feedback, created_at, updated_at
	`, strings.Join(setParts, ", "), argIndex)

	var submission models.Submission
	row := s.db.QueryRow(context.Background(), query, args...)

	err := row.Scan(
		&submission.ID,
		&submission.AssignmentID,
		&submission.StudentID,
		&submission.FilePath,
		&submission.Grade,
		&submission.Feedback,
		&submission.CreatedAt,
		&submission.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("submission not found")
		}
		return nil, fmt.Errorf("failed to update submission: %w", err)
	}

	return &submission, nil
}

// DeleteSubmission deletes a submission from the database
func (s *SubmissionStore) DeleteSubmission(submissionID string) error {
	query := `DELETE FROM submissions WHERE id = $1`

	result, err := s.db.Exec(context.Background(), query, submissionID)
	if err != nil {
		return fmt.Errorf("failed to delete submission: %w", err)
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("submission not found")
	}

	return nil
}
