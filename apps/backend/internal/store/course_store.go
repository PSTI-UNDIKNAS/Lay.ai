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

// CourseStore handles database operations for courses
type CourseStore struct {
	db *pgxpool.Pool
}

// NewCourseStore creates a new CourseStore
func NewCourseStore(db *pgxpool.Pool) *CourseStore {
	return &CourseStore{
		db: db,
	}
}

// CreateCourse saves a new course to the database
func (s *CourseStore) CreateCourse(course *models.Course) (*models.Course, error) {
	query := `
		INSERT INTO courses (creator_id, title, description, access_type, estimated_hours, password_hash, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	course.CreatedAt = now
	course.UpdatedAt = now

	row := s.db.QueryRow(
		context.Background(),
		query,
		course.CreatorID,
		course.Title,
		course.Description,
		course.AccessType,
		course.EstimatedHours,
		course.PasswordHash,
		course.CreatedAt,
		course.UpdatedAt,
	)

	err := row.Scan(&course.ID, &course.CreatedAt, &course.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create course: %w", err)
	}

	return course, nil
}

// GetCourseByID retrieves a course by its ID
func (s *CourseStore) GetCourseByID(courseID string) (*models.Course, error) {
	query := `
		SELECT
			c.id,
			c.creator_id,
			u.name,
			c.title,
			c.description,
			c.access_type,
			c.estimated_hours,
			(
				SELECT COUNT(*)
				FROM enrollments e
				WHERE e.course_id = c.id AND e.status = 'enrolled'
			) AS student_count,
			c.password_hash,
			c.created_at,
			c.updated_at
		FROM courses c
		JOIN users u ON u.id = c.creator_id
		WHERE c.id = $1
	`

	var course models.Course
	row := s.db.QueryRow(context.Background(), query, courseID)

	err := row.Scan(
		&course.ID,
		&course.CreatorID,
		&course.CreatorName,
		&course.Title,
		&course.Description,
		&course.AccessType,
		&course.EstimatedHours,
		&course.StudentCount,
		&course.PasswordHash,
		&course.CreatedAt,
		&course.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("course not found")
		}
		return nil, fmt.Errorf("failed to get course: %w", err)
	}

	return &course, nil
}

// GetCourses retrieves courses with optional filtering
func (s *CourseStore) GetCourses(creatorID *string, limit, offset int) ([]*models.Course, error) {
	var query strings.Builder
	var args []interface{}
	argIndex := 1

	query.WriteString(`
		SELECT
			c.id,
			c.creator_id,
			u.name,
			c.title,
			c.description,
			c.access_type,
			c.estimated_hours,
			(
				SELECT COUNT(*)
				FROM enrollments e
				WHERE e.course_id = c.id AND e.status = 'enrolled'
			) AS student_count,
			c.password_hash,
			c.created_at,
			c.updated_at
		FROM courses c
		JOIN users u ON u.id = c.creator_id
	`)

	if creatorID != nil {
		query.WriteString(fmt.Sprintf(" WHERE c.creator_id = $%d", argIndex))
		args = append(args, *creatorID)
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
		return nil, fmt.Errorf("failed to get courses: %w", err)
	}
	defer rows.Close()

	var courses []*models.Course
	for rows.Next() {
		var course models.Course
		err := rows.Scan(
			&course.ID,
			&course.CreatorID,
			&course.CreatorName,
			&course.Title,
			&course.Description,
			&course.AccessType,
			&course.EstimatedHours,
			&course.StudentCount,
			&course.PasswordHash,
			&course.CreatedAt,
			&course.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan course: %w", err)
		}
		courses = append(courses, &course)
	}

	return courses, nil
}

// UpdateCourse updates a course in the database
func (s *CourseStore) UpdateCourse(courseID string, updates map[string]interface{}) (*models.Course, error) {
	if len(updates) == 0 {
		return s.GetCourseByID(courseID)
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

	// Add the course ID for the WHERE clause
	args = append(args, courseID)

	query := fmt.Sprintf(`
		UPDATE courses
		SET %s
		WHERE id = $%d
		RETURNING id, creator_id, title, description, access_type, estimated_hours, password_hash, created_at, updated_at
	`, strings.Join(setParts, ", "), argIndex)

	var course models.Course
	row := s.db.QueryRow(context.Background(), query, args...)

	err := row.Scan(
		&course.ID,
		&course.CreatorID,
		&course.Title,
		&course.Description,
		&course.AccessType,
		&course.EstimatedHours,
		&course.PasswordHash,
		&course.CreatedAt,
		&course.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("course not found")
		}
		return nil, fmt.Errorf("failed to update course: %w", err)
	}

	return &course, nil
}

// DeleteCourse deletes a course from the database
func (s *CourseStore) DeleteCourse(courseID string) error {
	query := `DELETE FROM courses WHERE id = $1`

	result, err := s.db.Exec(context.Background(), query, courseID)
	if err != nil {
		return fmt.Errorf("failed to delete course: %w", err)
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("course not found")
	}

	return nil
}

// GetEnrollments retrieves enrollments with optional filtering
func (s *CourseStore) GetEnrollments(studentID, courseID *string, status *models.EnrollmentStatus, limit, offset int) ([]*models.Enrollment, error) {
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

// DeleteEnrollment deletes an enrollment from the database
func (s *CourseStore) DeleteEnrollment(enrollmentID string) error {
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
