package services

import (
	"fmt"

	"lay.ai/backend/internal/models"
	"lay.ai/backend/internal/store"
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