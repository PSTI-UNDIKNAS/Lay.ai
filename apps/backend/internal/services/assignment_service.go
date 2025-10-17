package services

import (
	"fmt"

	"github.com/google/uuid"
	"lay.ai/backend/internal/models"
	"lay.ai/backend/internal/store"
)

// AssignmentService handles assignment-related business logic
type AssignmentService struct {
	assignmentStore *store.AssignmentStore
}

// NewAssignmentService creates a new AssignmentService
func NewAssignmentService(assignmentStore *store.AssignmentStore) *AssignmentService {
	return &AssignmentService{
		assignmentStore: assignmentStore,
	}
}

// CreateAssignment handles assignment creation business logic
func (s *AssignmentService) CreateAssignment(learningUnitID, title, description string, dueDate *string) (*models.Assignment, error) {
	// Validate required fields
	if learningUnitID == "" {
		return nil, fmt.Errorf("learning unit ID is required")
	}
	if title == "" {
		return nil, fmt.Errorf("assignment title is required")
	}

	// Create assignment object
	assignment := &models.Assignment{
		LearningUnitID: uuid.MustParse(learningUnitID),
		Title:          title,
		Description:    description,
	}

	// Parse due date if provided
	if dueDate != nil && *dueDate != "" {
		// Note: In a real implementation, you'd parse the date string
		// For now, we'll let the store handle this
	}

	// Save to database
	return s.assignmentStore.CreateAssignment(assignment)
}

// GetAssignmentByID retrieves an assignment by its ID
func (s *AssignmentService) GetAssignmentByID(assignmentID string) (*models.Assignment, error) {
	if assignmentID == "" {
		return nil, fmt.Errorf("assignment ID is required")
	}

	return s.assignmentStore.GetAssignmentByID(assignmentID)
}

// GetAssignmentsByLearningUnitID retrieves assignments for a specific learning unit
func (s *AssignmentService) GetAssignmentsByLearningUnitID(learningUnitID string, limit, offset int) ([]*models.Assignment, error) {
	if learningUnitID == "" {
		return nil, fmt.Errorf("learning unit ID is required")
	}

	// Set default limit if not provided
	if limit <= 0 {
		limit = 50
	}

	return s.assignmentStore.GetAssignmentsByLearningUnitID(learningUnitID, limit, offset)
}

// UpdateAssignment handles assignment update business logic
func (s *AssignmentService) UpdateAssignment(assignmentID string, updates map[string]interface{}) (*models.Assignment, error) {
	if assignmentID == "" {
		return nil, fmt.Errorf("assignment ID is required")
	}

	// Validate updates
	if title, exists := updates["title"]; exists {
		if titleStr, ok := title.(string); ok && titleStr == "" {
			return nil, fmt.Errorf("assignment title cannot be empty")
		}
	}

	return s.assignmentStore.UpdateAssignment(assignmentID, updates)
}

// DeleteAssignment handles assignment deletion business logic
func (s *AssignmentService) DeleteAssignment(assignmentID string) error {
	if assignmentID == "" {
		return fmt.Errorf("assignment ID is required")
	}

	// Check if assignment exists before deletion
	_, err := s.assignmentStore.GetAssignmentByID(assignmentID)
	if err != nil {
		return fmt.Errorf("assignment not found: %w", err)
	}

	return s.assignmentStore.DeleteAssignment(assignmentID)
}

// CreateSubmission handles submission creation business logic
func (s *AssignmentService) CreateSubmission(assignmentID, studentID, filePath string) (*models.Submission, error) {
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
	return s.assignmentStore.CreateSubmission(submission)
}

// GetSubmissionByID retrieves a submission by its ID
func (s *AssignmentService) GetSubmissionByID(submissionID string) (*models.Submission, error) {
	if submissionID == "" {
		return nil, fmt.Errorf("submission ID is required")
	}

	return s.assignmentStore.GetSubmissionByID(submissionID)
}

// GetSubmissions retrieves submissions with optional filtering
func (s *AssignmentService) GetSubmissions(assignmentID, studentID *string, limit, offset int) ([]*models.Submission, error) {
	// Set default limit if not provided
	if limit <= 0 {
		limit = 50
	}

	return s.assignmentStore.GetSubmissions(assignmentID, studentID, limit, offset)
}

// DeleteSubmission handles submission deletion business logic
func (s *AssignmentService) DeleteSubmission(submissionID string) error {
	if submissionID == "" {
		return fmt.Errorf("submission ID is required")
	}

	return s.assignmentStore.DeleteSubmission(submissionID)
}