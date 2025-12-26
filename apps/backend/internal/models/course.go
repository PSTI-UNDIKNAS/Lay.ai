package models

import (
	"time"

	"github.com/google/uuid"
)

// AccessType represents the course access type enum
type AccessType string

const (
	AccessTypePublic    AccessType = "public"
	AccessTypePassword  AccessType = "password"
	AccessTypeByRequest AccessType = "by_request"
)

// EnrollmentStatus represents the enrollment status enum
type EnrollmentStatus string

const (
	EnrollmentStatusEnrolled        EnrollmentStatus = "enrolled"
	EnrollmentStatusPendingApproval EnrollmentStatus = "pending_approval"
	EnrollmentStatusDenied          EnrollmentStatus = "denied"
)

// Course represents a course in the system
type Course struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	CreatorID      uuid.UUID  `json:"creator_id" db:"creator_id"`
	CreatorName    string     `json:"creator_name,omitempty" db:"creator_name"`
	Title          string     `json:"title" db:"title"`
	Description    string     `json:"description" db:"description"`
	AccessType     AccessType `json:"access_type" db:"access_type"`
	StudentCount   int        `json:"student_count,omitempty" db:"student_count"`
	EstimatedHours int        `json:"estimated_hours" db:"estimated_hours"`
	PasswordHash   string     `json:"-" db:"password_hash"` // "-" means don't include in JSON responses
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
}

// CreateCourseRequest represents the request payload for creating a course
type CreateCourseRequest struct {
	Title          string     `json:"title" binding:"required"`
	Description    string     `json:"description"`
	AccessType     AccessType `json:"access_type" binding:"required,oneof=public password by_request"`
	EstimatedHours int        `json:"estimated_hours" binding:"required"`
	Password       string     `json:"password"` // Only required if access_type is "password"
}

// UpdateCourseRequest represents the request payload for updating a course
type UpdateCourseRequest struct {
	Title          string     `json:"title"`
	Description    string     `json:"description"`
	AccessType     AccessType `json:"access_type" binding:"omitempty,oneof=public password by_request"`
	EstimatedHours *int       `json:"estimated_hours"`
	Password       string     `json:"password"` // Only used if access_type is "password"
}

// CourseResponse represents the response for course operations
type CourseResponse struct {
	ID          uuid.UUID  `json:"id"`
	CreatorID   uuid.UUID  `json:"creator_id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	AccessType  AccessType `json:"access_type"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// GetCoursesResponse represents the response for getting multiple courses
type GetCoursesResponse struct {
	Courses []CourseResponse `json:"courses"`
	Total   int              `json:"total"`
}

// Enrollment represents an enrollment record
type Enrollment struct {
	ID        uuid.UUID        `json:"id" db:"id"`
	StudentID uuid.UUID        `json:"student_id" db:"student_id"`
	CourseID  uuid.UUID        `json:"course_id" db:"course_id"`
	Status    EnrollmentStatus `json:"status" db:"status"`
	CreatedAt time.Time        `json:"created_at" db:"created_at"`
	UpdatedAt time.Time        `json:"updated_at" db:"updated_at"`
}

// EnrollmentResponse represents the response for enrollment operations
type EnrollmentResponse struct {
	ID        uuid.UUID        `json:"id"`
	StudentID uuid.UUID        `json:"student_id"`
	CourseID  uuid.UUID        `json:"course_id"`
	Status    EnrollmentStatus `json:"status"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`
}
