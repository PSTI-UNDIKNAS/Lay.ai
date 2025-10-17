package services

import (
	"fmt"

	"github.com/google/uuid"
	"lay.ai/backend/internal/models"
	"lay.ai/backend/internal/store"
)

// SubmissionService handles submission-related business logic
type SubmissionService struct {
	submissionStore *store.SubmissionStore
}

// NewSubmissionService creates a new SubmissionService
func NewSubmissionService(submissionStore *store.SubmissionStore) *SubmissionService {
	return &SubmissionService{
		submissionStore: submissionStore,
	}
}

// CreateSubmission handles submission creation business logic
func (s *SubmissionService) CreateSubmission(assignmentID, studentID, filePath string) (*models.Submission, error) {
	// Validate required fields
	if assignmentID == "" {
		return nil, fmt.Errorf("assignment ID is required")
	}
	if studentID == "" {
		return nil, fmt.Errorf("student ID is required")
	}
	if filePath == "" {
		return nil, fmt.Errorf("submission file path is required")
	}

	// Create submission object
	submission := &models.Submission{
		AssignmentID: uuid.MustParse(assignmentID),
		StudentID:    uuid.MustParse(studentID),
		FilePath:     filePath,
	}

	// Save to database
	return s.submissionStore.CreateSubmission(submission)
}

// GetSubmissionByID retrieves a submission by its ID
func (s *SubmissionService) GetSubmissionByID(submissionID string) (*models.Submission, error) {
	if submissionID == "" {
		return nil, fmt.Errorf("submission ID is required")
	}

	return s.submissionStore.GetSubmissionByID(submissionID)
}

// GetSubmissions retrieves submissions with optional filtering
func (s *SubmissionService) GetSubmissions(assignmentID, studentID *string, limit, offset int) ([]*models.Submission, error) {
	// Set default limit if not provided
	if limit <= 0 {
		limit = 50
	}

	return s.submissionStore.GetSubmissions(assignmentID, studentID, limit, offset)
}

// UpdateSubmission handles submission update business logic (for grading)
func (s *SubmissionService) UpdateSubmission(submissionID string, updates map[string]interface{}) (*models.Submission, error) {
	if submissionID == "" {
		return nil, fmt.Errorf("submission ID is required")
	}

	// Validate updates - typically used for grading
	if grade, exists := updates["grade"]; exists {
		if gradeStr, ok := grade.(string); ok && gradeStr != "" {
			// Grade validation could be added here
		}
	}

	return s.submissionStore.UpdateSubmission(submissionID, updates)
}

// DeleteSubmission handles submission deletion business logic
func (s *SubmissionService) DeleteSubmission(submissionID string) error {
	if submissionID == "" {
		return fmt.Errorf("submission ID is required")
	}

	// Check if submission exists before deletion
	_, err := s.submissionStore.GetSubmissionByID(submissionID)
	if err != nil {
		return fmt.Errorf("submission not found: %w", err)
	}

	return s.submissionStore.DeleteSubmission(submissionID)
}