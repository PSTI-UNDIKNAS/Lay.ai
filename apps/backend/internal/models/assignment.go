package models

import (
	"time"

	"github.com/google/uuid"
)

// Assignment represents an assignment in the system
type Assignment struct {
	ID               uuid.UUID  `json:"id" db:"id"`
	LearningUnitID   uuid.UUID  `json:"learning_unit_id" db:"learning_unit_id"`
	Title            string     `json:"title" db:"title"`
	Description      string     `json:"description" db:"description"`
	DueDate          *time.Time `json:"due_date" db:"due_date"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at" db:"updated_at"`
}

// CreateAssignmentRequest represents the request payload for creating an assignment
type CreateAssignmentRequest struct {
	Title       string     `json:"title" binding:"required"`
	Description string     `json:"description"`
	DueDate     *time.Time `json:"due_date"`
}

// UpdateAssignmentRequest represents the request payload for updating an assignment
type UpdateAssignmentRequest struct {
	Title       string     `json:"title"`
	Description string     `json:"description"`
	DueDate     *time.Time `json:"due_date"`
}

// AssignmentResponse represents the response for assignment operations
type AssignmentResponse struct {
	ID               uuid.UUID  `json:"id"`
	LearningUnitID   uuid.UUID  `json:"learning_unit_id"`
	Title            string     `json:"title"`
	Description      string     `json:"description"`
	DueDate          *time.Time `json:"due_date"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// GetAssignmentsResponse represents the response for getting multiple assignments
type GetAssignmentsResponse struct {
	Assignments []AssignmentResponse `json:"assignments"`
	Total       int                  `json:"total"`
}

// Submission represents a submission in the system
type Submission struct {
	ID           uuid.UUID `json:"id" db:"id"`
	AssignmentID uuid.UUID `json:"assignment_id" db:"assignment_id"`
	StudentID    uuid.UUID `json:"student_id" db:"student_id"`
	FilePath     string    `json:"file_path" db:"file_path"`
	Grade        string    `json:"grade" db:"grade"`
	Feedback     string    `json:"feedback" db:"feedback"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

// CreateSubmissionRequest represents the request payload for creating a submission
type CreateSubmissionRequest struct {
	FilePath string `json:"file_path" binding:"required"`
}

// UpdateSubmissionRequest represents the request payload for updating a submission (grading)
type UpdateSubmissionRequest struct {
	Grade    string `json:"grade"`
	Feedback string `json:"feedback"`
}

// SubmissionResponse represents the response for submission operations
type SubmissionResponse struct {
	ID           uuid.UUID `json:"id"`
	AssignmentID uuid.UUID `json:"assignment_id"`
	StudentID    uuid.UUID `json:"student_id"`
	FilePath     string    `json:"file_path"`
	Grade        string    `json:"grade"`
	Feedback     string    `json:"feedback"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// GetSubmissionsResponse represents the response for getting multiple submissions
type GetSubmissionsResponse struct {
	Submissions []SubmissionResponse `json:"submissions"`
	Total       int                  `json:"total"`
}