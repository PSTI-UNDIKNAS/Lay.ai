package store

import (
	"context"
	"fmt"
	"strings"
	"time"

	"lay.ai/backend/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AssignmentStore handles database operations for assignments and submissions
type AssignmentStore struct {
	db *pgxpool.Pool
}

// NewAssignmentStore creates a new AssignmentStore
func NewAssignmentStore(db *pgxpool.Pool) *AssignmentStore {
	return &AssignmentStore{
		db: db,
	}
}

// CreateAssignment saves a new assignment to the database
func (s *AssignmentStore) CreateAssignment(assignment *models.Assignment) (*models.Assignment, error) {
	query := `
		INSERT INTO assignments (learning_unit_id, title, description, due_date, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	assignment.CreatedAt = now
	assignment.UpdatedAt = now

	row := s.db.QueryRow(
		context.Background(),
		query,
		assignment.LearningUnitID,
		assignment.Title,
		assignment.Description,
		assignment.DueDate,
		assignment.CreatedAt,
		assignment.UpdatedAt,
	)

	err := row.Scan(&assignment.ID, &assignment.CreatedAt, &assignment.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create assignment: %w", err)
	}

	return assignment, nil
}

// GetAssignmentByID retrieves an assignment by its ID
func (s *AssignmentStore) GetAssignmentByID(assignmentID string) (*models.Assignment, error) {
	query := `
		SELECT id, learning_unit_id, title, description, due_date, created_at, updated_at
		FROM assignments
		WHERE id = $1
	`

	var assignment models.Assignment
	row := s.db.QueryRow(context.Background(), query, assignmentID)

	err := row.Scan(
		&assignment.ID,
		&assignment.LearningUnitID,
		&assignment.Title,
		&assignment.Description,
		&assignment.DueDate,
		&assignment.CreatedAt,
		&assignment.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("assignment not found")
		}
		return nil, fmt.Errorf("failed to get assignment: %w", err)
	}

	return &assignment, nil
}

// GetAssignmentsByLearningUnitID retrieves assignments for a specific learning unit
func (s *AssignmentStore) GetAssignmentsByLearningUnitID(unitID string, limit, offset int) ([]*models.Assignment, error) {
	var query strings.Builder
	var args []interface{}
	argIndex := 1

	query.WriteString(`
		SELECT id, learning_unit_id, title, description, due_date, created_at, updated_at
		FROM assignments
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
		return nil, fmt.Errorf("failed to get assignments: %w", err)
	}
	defer rows.Close()

	var assignments []*models.Assignment
	for rows.Next() {
		var assignment models.Assignment
		err := rows.Scan(
			&assignment.ID,
			&assignment.LearningUnitID,
			&assignment.Title,
			&assignment.Description,
			&assignment.DueDate,
			&assignment.CreatedAt,
			&assignment.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan assignment: %w", err)
		}
		assignments = append(assignments, &assignment)
	}

	return assignments, nil
}

// UpdateAssignment updates an assignment in the database
func (s *AssignmentStore) UpdateAssignment(assignmentID string, updates map[string]interface{}) (*models.Assignment, error) {
	if len(updates) == 0 {
		return s.GetAssignmentByID(assignmentID)
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

	// Add the assignment ID for the WHERE clause
	args = append(args, assignmentID)

	query := fmt.Sprintf(`
		UPDATE assignments
		SET %s
		WHERE id = $%d
		RETURNING id, learning_unit_id, title, description, due_date, created_at, updated_at
	`, strings.Join(setParts, ", "), argIndex)

	var assignment models.Assignment
	row := s.db.QueryRow(context.Background(), query, args...)

	err := row.Scan(
		&assignment.ID,
		&assignment.LearningUnitID,
		&assignment.Title,
		&assignment.Description,
		&assignment.DueDate,
		&assignment.CreatedAt,
		&assignment.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("assignment not found")
		}
		return nil, fmt.Errorf("failed to update assignment: %w", err)
	}

	return &assignment, nil
}

// DeleteAssignment deletes an assignment from the database
func (s *AssignmentStore) DeleteAssignment(assignmentID string) error {
	query := `DELETE FROM assignments WHERE id = $1`

	result, err := s.db.Exec(context.Background(), query, assignmentID)
	if err != nil {
		return fmt.Errorf("failed to delete assignment: %w", err)
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("assignment not found")
	}

	return nil
}

// CreateSubmission saves a new submission to the database
func (s *AssignmentStore) CreateSubmission(submission *models.Submission) (*models.Submission, error) {
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
func (s *AssignmentStore) GetSubmissionByID(submissionID string) (*models.Submission, error) {
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
func (s *AssignmentStore) GetSubmissions(assignmentID, studentID *string, limit, offset int) ([]*models.Submission, error) {
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

func (s *AssignmentStore) CountAssignmentsByLearningUnitIDs(unitIDs []uuid.UUID) (map[uuid.UUID]int, error) {
	if len(unitIDs) == 0 {
		return map[uuid.UUID]int{}, nil
	}

	query := `
		SELECT learning_unit_id, COUNT(*)
		FROM assignments
		WHERE learning_unit_id = ANY($1)
		GROUP BY learning_unit_id
	`

	rows, err := s.db.Query(context.Background(), query, unitIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to count assignments: %w", err)
	}
	defer rows.Close()

	counts := make(map[uuid.UUID]int, len(unitIDs))
	for rows.Next() {
		var unitID uuid.UUID
		var count int
		if err := rows.Scan(&unitID, &count); err != nil {
			return nil, fmt.Errorf("failed to scan assignment count: %w", err)
		}
		counts[unitID] = count
	}

	return counts, nil
}

// DeleteSubmission deletes a submission from the database
func (s *AssignmentStore) DeleteSubmission(submissionID string) error {
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
