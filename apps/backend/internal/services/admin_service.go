package services

import (
	"fmt"

	"lay.ai/backend/internal/models"
	"lay.ai/backend/internal/store"

	"golang.org/x/crypto/bcrypt"
)

type AdminService struct {
	userStore *store.UserStore
}

func NewAdminService(userStore *store.UserStore) *AdminService {
	return &AdminService{
		userStore: userStore,
	}
}

// GetPendingLecturers retrieves all lecturers awaiting approval
func (s *AdminService) GetPendingLecturers() ([]*models.User, error) {
	lecturers, err := s.userStore.GetPendingLecturers()
	if err != nil {
		return nil, fmt.Errorf("failed to get pending lecturers: %w", err)
	}

	// Remove sensitive information before returning
	for _, lecturer := range lecturers {
		lecturer.PasswordHash = "" // Don't expose password hash
	}

	return lecturers, nil
}

// ApproveLecturer approves a pending lecturer account
func (s *AdminService) ApproveLecturer(lecturerID string) error {
	// First, verify the user exists and is a lecturer with pending status
	user, err := s.userStore.GetUserByID(lecturerID)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}

	if user.Role != models.RoleLecturer {
		return fmt.Errorf("user is not a lecturer")
	}

	if user.Status != models.StatusPendingApproval {
		return fmt.Errorf("lecturer is not in pending approval status")
	}

	// Update the user's status to active
	err = s.userStore.UpdateUserStatus(lecturerID, models.StatusActive)
	if err != nil {
		return fmt.Errorf("failed to approve lecturer: %w", err)
	}

	return nil
}

// GetUsers retrieves all users with optional filtering and pagination
func (s *AdminService) GetUsers(role *models.UserRole, status *models.UserStatus, limit, offset int) ([]*models.User, error) {
	users, err := s.userStore.GetUsers(role, status, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get users: %w", err)
	}

	// Remove sensitive information before returning
	for _, user := range users {
		user.PasswordHash = "" // Don't expose password hash
	}

	return users, nil
}

// GetUserByID retrieves a single user by ID
func (s *AdminService) GetUserByID(userID string) (*models.User, error) {
	user, err := s.userStore.GetUserByID(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Remove sensitive information before returning
	user.PasswordHash = ""

	return user, nil
}

// CreateUser creates a new user with any role (admin privilege)
func (s *AdminService) CreateUser(name, email, uniqueIdentifier, password string, role models.UserRole, status models.UserStatus) (*models.User, error) {
	// Hash the password using bcrypt
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user object with hashed password
	user := &models.User{
		Name:             name,
		Email:            email,
		UniqueIdentifier: uniqueIdentifier,
		PasswordHash:     string(hashedPassword),
		Role:             role,
		Status:           status,
	}

	// Call UserStore to save the user to the database
	createdUser, err := s.userStore.CreateUser(user)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Remove sensitive information before returning
	createdUser.PasswordHash = ""

	return createdUser, nil
}

// UpdateUser updates a user's information
func (s *AdminService) UpdateUser(userID string, updates map[string]interface{}) (*models.User, error) {
	// Validate that we're not trying to update sensitive fields inappropriately
	if _, exists := updates["password_hash"]; exists {
		return nil, fmt.Errorf("password cannot be updated through this endpoint")
	}

	// Validate role if being updated
	if roleValue, exists := updates["role"]; exists {
		roleStr, ok := roleValue.(string)
		if !ok {
			return nil, fmt.Errorf("invalid role format")
		}
		role := models.UserRole(roleStr)
		if role != models.RoleStudent && role != models.RoleLecturer && role != models.RoleAdmin {
			return nil, fmt.Errorf("invalid role value")
		}
	}

	// Validate status if being updated
	if statusValue, exists := updates["status"]; exists {
		statusStr, ok := statusValue.(string)
		if !ok {
			return nil, fmt.Errorf("invalid status format")
		}
		status := models.UserStatus(statusStr)
		if status != models.StatusActive && status != models.StatusPendingApproval && status != models.StatusInactive {
			return nil, fmt.Errorf("invalid status value")
		}
	}

	updatedUser, err := s.userStore.UpdateUser(userID, updates)
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	// Remove sensitive information before returning
	updatedUser.PasswordHash = ""

	return updatedUser, nil
}

// DeleteUser soft deletes a user (sets status to inactive)
func (s *AdminService) DeleteUser(userID string) error {
	// First check if user exists
	_, err := s.userStore.GetUserByID(userID)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}

	// Soft delete the user
	err = s.userStore.DeleteUser(userID)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	return nil
}