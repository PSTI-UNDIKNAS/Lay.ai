package services

import (
	"fmt"

	"lay.ai/backend/internal/models"
	"lay.ai/backend/internal/store"

	"golang.org/x/crypto/bcrypt"
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

	// Create user object with hashed password
	user := &models.User{
		Name:             name,
		Email:            email,
		UniqueIdentifier: uniqueIdentifier,
		PasswordHash:     string(hashedPassword),
		Role:             role,
		Status:           models.StatusActive, // Default status
	}

	// Call UserStore to save the user to the database
	createdUser, err := s.userStore.CreateUser(user)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return createdUser, nil
}
