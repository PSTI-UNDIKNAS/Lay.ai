package services

import (
	"errors"
	"fmt"

	"lay.ai/backend/internal/models"
	"lay.ai/backend/internal/store"
	"lay.ai/backend/internal/utils"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrPendingApproval    = errors.New("pending approval")
	ErrInactiveAccount    = errors.New("inactive account")
)

// AuthService handles authentication business logic
type AuthService struct {
	userStore *store.UserStore
}

// NewAuthService creates a new AuthService
func NewAuthService(userStore *store.UserStore) *AuthService {
	return &AuthService{
		userStore: userStore,
	}
}

// RegisterUser handles user registration business logic
func (s *AuthService) RegisterUser(name, email string, uniqueIdentifier string, password string, role models.UserRole) (*models.User, error) {
	// Hash the password using bcrypt (critical security step)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Determine user status based on role
	var status models.UserStatus
	if role == models.RoleLecturer {
		status = models.StatusPendingApproval // Lecturers need approval
	} else {
		status = models.StatusActive // Students and admins are active by default
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

	return createdUser, nil
}

// LoginUser handles user login business logic
func (s *AuthService) LoginUser(email, password string) (*models.LoginResponse, error) {
	// Get user by email
	user, err := s.userStore.GetUserByEmail(email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	// Check if user is allowed to log in based on status
	switch user.Status {
	case models.StatusActive:
	case models.StatusPendingApproval:
		return nil, ErrPendingApproval
	case models.StatusInactive:
		return nil, ErrInactiveAccount
	default:
		return nil, ErrInactiveAccount
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	// Generate JWT token
	token, err := utils.GenerateJWT(user.ID.String(), user.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	// Create response
	response := &models.LoginResponse{
		Token: token,
		User:  *user,
	}

	return response, nil
}

// GetUserByID retrieves a user by ID
func (s *AuthService) GetUserByID(userID string) (*models.User, error) {
	// Call UserStore to get the user by ID
	user, err := s.userStore.GetUserByID(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}
