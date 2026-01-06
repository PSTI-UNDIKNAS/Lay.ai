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

// LearningUnitStore handles database operations for learning units
type LearningUnitStore struct {
	db *pgxpool.Pool
}

// NewLearningUnitStore creates a new LearningUnitStore
func NewLearningUnitStore(db *pgxpool.Pool) *LearningUnitStore {
	return &LearningUnitStore{
		db: db,
	}
}

// CreateLearningUnit saves a new learning unit to the database
func (s *LearningUnitStore) CreateLearningUnit(unit *models.LearningUnit) (*models.LearningUnit, error) {
	query := `
		INSERT INTO learning_units (course_id, title, description, unit_order, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	unit.CreatedAt = now
	unit.UpdatedAt = now

	row := s.db.QueryRow(
		context.Background(),
		query,
		unit.CourseID,
		unit.Title,
		unit.Description,
		unit.UnitOrder,
		unit.CreatedAt,
		unit.UpdatedAt,
	)

	err := row.Scan(&unit.ID, &unit.CreatedAt, &unit.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create learning unit: %w", err)
	}

	return unit, nil
}

// GetLearningUnitByID retrieves a learning unit by its ID
func (s *LearningUnitStore) GetLearningUnitByID(unitID string) (*models.LearningUnit, error) {
	query := `
		SELECT id, course_id, title, description, unit_order, created_at, updated_at
		FROM learning_units
		WHERE id = $1
	`

	var unit models.LearningUnit
	row := s.db.QueryRow(context.Background(), query, unitID)

	err := row.Scan(
		&unit.ID,
		&unit.CourseID,
		&unit.Title,
		&unit.Description,
		&unit.UnitOrder,
		&unit.CreatedAt,
		&unit.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("learning unit not found")
		}
		return nil, fmt.Errorf("failed to get learning unit: %w", err)
	}

	return &unit, nil
}

// GetLearningUnitsByCourseID retrieves learning units for a specific course
func (s *LearningUnitStore) GetLearningUnitsByCourseID(courseID string, limit, offset int) ([]*models.LearningUnit, error) {
	var query strings.Builder
	var args []interface{}
	argIndex := 1

	query.WriteString(`
		SELECT id, course_id, title, description, unit_order, created_at, updated_at
		FROM learning_units
		WHERE course_id = $1
		ORDER BY unit_order ASC
	`)
	args = append(args, courseID)
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
		return nil, fmt.Errorf("failed to get learning units: %w", err)
	}
	defer rows.Close()

	var units []*models.LearningUnit
	for rows.Next() {
		var unit models.LearningUnit
		err := rows.Scan(
			&unit.ID,
			&unit.CourseID,
			&unit.Title,
			&unit.Description,
			&unit.UnitOrder,
			&unit.CreatedAt,
			&unit.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan learning unit: %w", err)
		}
		units = append(units, &unit)
	}

	return units, nil
}

// UpdateLearningUnit updates a learning unit in the database
func (s *LearningUnitStore) UpdateLearningUnit(unitID string, updates map[string]interface{}) (*models.LearningUnit, error) {
	if len(updates) == 0 {
		return s.GetLearningUnitByID(unitID)
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

	// Add the unit ID for the WHERE clause
	args = append(args, unitID)

	query := fmt.Sprintf(`
		UPDATE learning_units
		SET %s
		WHERE id = $%d
		RETURNING id, course_id, title, description, unit_order, created_at, updated_at
	`, strings.Join(setParts, ", "), argIndex)

	var unit models.LearningUnit
	row := s.db.QueryRow(context.Background(), query, args...)

	err := row.Scan(
		&unit.ID,
		&unit.CourseID,
		&unit.Title,
		&unit.Description,
		&unit.UnitOrder,
		&unit.CreatedAt,
		&unit.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("learning unit not found")
		}
		return nil, fmt.Errorf("failed to update learning unit: %w", err)
	}

	return &unit, nil
}

// DeleteLearningUnit deletes a learning unit from the database
func (s *LearningUnitStore) DeleteLearningUnit(unitID string) error {
	query := `DELETE FROM learning_units WHERE id = $1`

	result, err := s.db.Exec(context.Background(), query, unitID)
	if err != nil {
		return fmt.Errorf("failed to delete learning unit: %w", err)
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("learning unit not found")
	}

	return nil
}