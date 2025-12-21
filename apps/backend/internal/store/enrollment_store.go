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

// EnrollmentStore handles database operations for enrollments
type EnrollmentStore struct {
	db *pgxpool.Pool
}

// NewEnrollmentStore creates a new EnrollmentStore
func NewEnrollmentStore(db *pgxpool.Pool) *EnrollmentStore {
	return &EnrollmentStore{
		db: db,
	}
}

// CreateEnrollment creates a new enrollment in the database
func (s *EnrollmentStore) CreateEnrollment(enrollment *models.Enrollment) (*models.Enrollment, error) {
	query := `
		INSERT INTO enrollments (student_id, course_id, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, student_id, course_id, status, created_at, updated_at
	`

	now := time.Now()
	var result models.Enrollment

	err := s.db.QueryRow(
		context.Background(),
		query,
		enrollment.StudentID,
		enrollment.CourseID,
		enrollment.Status,
		now,
		now,
	).Scan(
		&result.ID,
		&result.StudentID,
		&result.CourseID,
		&result.Status,
		&result.CreatedAt,
		&result.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create enrollment: %w", err)
	}

	return &result, nil
}

// GetEnrollmentByID retrieves an enrollment by its ID
func (s *EnrollmentStore) GetEnrollmentByID(enrollmentID string) (*models.Enrollment, error) {
	query := `
		SELECT id, student_id, course_id, status, created_at, updated_at
		FROM enrollments
		WHERE id = $1
	`

	var enrollment models.Enrollment
	err := s.db.QueryRow(context.Background(), query, enrollmentID).Scan(
		&enrollment.ID,
		&enrollment.StudentID,
		&enrollment.CourseID,
		&enrollment.Status,
		&enrollment.CreatedAt,
		&enrollment.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("enrollment not found")
		}
		return nil, fmt.Errorf("failed to get enrollment: %w", err)
	}

	return &enrollment, nil
}

// GetEnrollmentByStudentAndCourse retrieves an enrollment by student and course ID
func (s *EnrollmentStore) GetEnrollmentByStudentAndCourse(studentID, courseID string) (*models.Enrollment, error) {
	query := `
		SELECT id, student_id, course_id, status, created_at, updated_at
		FROM enrollments
		WHERE student_id = $1 AND course_id = $2
	`

	var enrollment models.Enrollment
	err := s.db.QueryRow(context.Background(), query, studentID, courseID).Scan(
		&enrollment.ID,
		&enrollment.StudentID,
		&enrollment.CourseID,
		&enrollment.Status,
		&enrollment.CreatedAt,
		&enrollment.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil // Return nil if not found (not an error in this case)
		}
		return nil, fmt.Errorf("failed to get enrollment: %w", err)
	}

	return &enrollment, nil
}

// GetEnrollments retrieves enrollments with optional filtering
func (s *EnrollmentStore) GetEnrollments(studentID, courseID *string, status *models.EnrollmentStatus, limit, offset int) ([]*models.Enrollment, error) {
	var query strings.Builder
	var args []interface{}
	argIndex := 1

	query.WriteString(`
		SELECT id, student_id, course_id, status, created_at, updated_at
		FROM enrollments
		WHERE 1=1
	`)

	if studentID != nil {
		query.WriteString(fmt.Sprintf(" AND student_id = $%d", argIndex))
		args = append(args, *studentID)
		argIndex++
	}

	if courseID != nil {
		query.WriteString(fmt.Sprintf(" AND course_id = $%d", argIndex))
		args = append(args, *courseID)
		argIndex++
	}

	if status != nil {
		query.WriteString(fmt.Sprintf(" AND status = $%d", argIndex))
		args = append(args, *status)
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
		return nil, fmt.Errorf("failed to get enrollments: %w", err)
	}
	defer rows.Close()

	var enrollments []*models.Enrollment
	for rows.Next() {
		var enrollment models.Enrollment
		err := rows.Scan(
			&enrollment.ID,
			&enrollment.StudentID,
			&enrollment.CourseID,
			&enrollment.Status,
			&enrollment.CreatedAt,
			&enrollment.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan enrollment: %w", err)
		}
		enrollments = append(enrollments, &enrollment)
	}

	return enrollments, nil
}

// UpdateEnrollment updates an enrollment in the database
func (s *EnrollmentStore) UpdateEnrollment(enrollmentID string, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return fmt.Errorf("no updates provided")
	}

	var setParts []string
	var args []interface{}
	argIndex := 1

	for field, value := range updates {
		setParts = append(setParts, fmt.Sprintf("%s = $%d", field, argIndex))
		args = append(args, value)
		argIndex++
	}

	// Add updated_at
	setParts = append(setParts, fmt.Sprintf("updated_at = $%d", argIndex))
	args = append(args, time.Now())
	argIndex++

	// Add WHERE clause
	args = append(args, enrollmentID)

	query := fmt.Sprintf(`
		UPDATE enrollments
		SET %s
		WHERE id = $%d
	`, strings.Join(setParts, ", "), argIndex)

	result, err := s.db.Exec(context.Background(), query, args...)
	if err != nil {
		return fmt.Errorf("failed to update enrollment: %w", err)
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("enrollment not found")
	}

	return nil
}

// DeleteEnrollment deletes an enrollment from the database
func (s *EnrollmentStore) DeleteEnrollment(enrollmentID string) error {
	query := `DELETE FROM enrollments WHERE id = $1`

	result, err := s.db.Exec(context.Background(), query, enrollmentID)
	if err != nil {
		return fmt.Errorf("failed to delete enrollment: %w", err)
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("enrollment not found")
	}

	return nil
}

func (s *EnrollmentStore) GetEnrolledStudentsByCourseID(courseID string) ([]*models.User, error) {
	query := `
		SELECT u.id, u.name, u.email, u.unique_identifier, u.role, u.status, u.created_at, u.updated_at
		FROM enrollments e
		JOIN users u ON u.id = e.student_id
		WHERE e.course_id = $1 AND e.status = $2
		ORDER BY u.name ASC
	`

	rows, err := s.db.Query(context.Background(), query, courseID, models.EnrollmentStatusEnrolled)
	if err != nil {
		return nil, fmt.Errorf("failed to get enrolled students: %w", err)
	}
	defer rows.Close()

	var students []*models.User
	for rows.Next() {
		var u models.User
		err := rows.Scan(
			&u.ID,
			&u.Name,
			&u.Email,
			&u.UniqueIdentifier,
			&u.Role,
			&u.Status,
			&u.CreatedAt,
			&u.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan enrolled student: %w", err)
		}
		students = append(students, &u)
	}

	return students, nil
}
