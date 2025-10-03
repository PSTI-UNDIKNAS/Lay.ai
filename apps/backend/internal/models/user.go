package models

import (
	"time"

	"github.com/google/uuid"
)

// UserRole represents the user role enum
type UserRole string

const (
	RoleStudent  UserRole = "student"
	RoleLecturer UserRole = "lecturer"
	RoleAdmin    UserRole = "admin"
)

// UserStatus represents the user status enum
type UserStatus string

const (
	StatusActive          UserStatus = "active"
	StatusPendingApproval UserStatus = "pending_approval"
)

// User represents a user in the system
type User struct {
	ID           uuid.UUID  `json:"id" db:"id"`
	Name         string     `json:"name" db:"name"`
	Email        string     `json:"email" db:"email"`
	NIM          *string    `json:"nim,omitempty" db:"nim"` // Nullable field for student ID
	PasswordHash string     `json:"-" db:"password_hash"`   // "-" means don't include in JSON responses
	Role         UserRole   `json:"role" db:"role"`
	Status       UserStatus `json:"status" db:"status"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
}

// RegisterRequest represents the request payload for user registration
type RegisterRequest struct {
	Name     string   `json:"name" binding:"required"`
	Email    string   `json:"email" binding:"required,email"`
	NIM      *string  `json:"nim,omitempty"` // Optional field for student ID
	Password string   `json:"password" binding:"required,min=6"`
	Role     UserRole `json:"role" binding:"required,oneof=student lecturer admin"`
}

// RegisterResponse represents the response after successful registration
type RegisterResponse struct {
	ID     uuid.UUID  `json:"id"`
	Name   string     `json:"name"`
	Email  string     `json:"email"`
	NIM    *string    `json:"nim,omitempty"`
	Role   UserRole   `json:"role"`
	Status UserStatus `json:"status"`
}
