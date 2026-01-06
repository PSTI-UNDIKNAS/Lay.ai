package models

import (
	"time"

	"github.com/google/uuid"
)

// LearningUnit represents a learning unit in the system
type LearningUnit struct {
	ID          uuid.UUID `json:"id" db:"id"`
	CourseID    uuid.UUID `json:"course_id" db:"course_id"`
	Title       string    `json:"title" db:"title"`
	Description string    `json:"description" db:"description"`
	UnitOrder   int       `json:"unit_order" db:"unit_order"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// CreateLearningUnitRequest represents the request payload for creating a learning unit
type CreateLearningUnitRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	UnitOrder   int    `json:"unit_order" binding:"required,min=1"`
}

// UpdateLearningUnitRequest represents the request payload for updating a learning unit
type UpdateLearningUnitRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	UnitOrder   int    `json:"unit_order" binding:"omitempty,min=1"`
}

// LearningUnitResponse represents the response for learning unit operations
type LearningUnitResponse struct {
	ID          uuid.UUID `json:"id"`
	CourseID    uuid.UUID `json:"course_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	UnitOrder   int       `json:"unit_order"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// GetLearningUnitsResponse represents the response for getting multiple learning units
type GetLearningUnitsResponse struct {
	LearningUnits []LearningUnitResponse `json:"learning_units"`
	Total         int                    `json:"total"`
}

// Document represents a document in the system
type Document struct {
	ID              uuid.UUID `json:"id" db:"id"`
	LearningUnitID  uuid.UUID `json:"learning_unit_id" db:"learning_unit_id"`
	FileName        string    `json:"file_name" db:"file_name"`
	StoragePath     string    `json:"storage_path" db:"storage_path"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time `json:"updated_at" db:"updated_at"`
}

// StudentProgress represents student progress in a course
type StudentProgress struct {
	ID                     uuid.UUID  `json:"id" db:"id"`
	StudentID              uuid.UUID  `json:"student_id" db:"student_id"`
	CourseID               uuid.UUID  `json:"course_id" db:"course_id"`
	CurrentLearningUnitID  *uuid.UUID `json:"current_learning_unit_id" db:"current_learning_unit_id"`
	CreatedAt              time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at" db:"updated_at"`
}

// UnitCompletion represents a completed learning unit
type UnitCompletion struct {
	ID               uuid.UUID `json:"id" db:"id"`
	StudentID        uuid.UUID `json:"student_id" db:"student_id"`
	LearningUnitID   uuid.UUID `json:"learning_unit_id" db:"learning_unit_id"`
	CompletedAt      time.Time `json:"completed_at" db:"completed_at"`
}