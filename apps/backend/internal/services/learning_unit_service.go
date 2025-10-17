package services

import (
	"fmt"

	"github.com/google/uuid"
	"lay.ai/backend/internal/models"
	"lay.ai/backend/internal/store"
)

// LearningUnitService handles learning unit-related business logic
type LearningUnitService struct {
	learningUnitStore *store.LearningUnitStore
}

// NewLearningUnitService creates a new LearningUnitService
func NewLearningUnitService(learningUnitStore *store.LearningUnitStore) *LearningUnitService {
	return &LearningUnitService{
		learningUnitStore: learningUnitStore,
	}
}

// CreateLearningUnit handles learning unit creation business logic
func (s *LearningUnitService) CreateLearningUnit(courseID, title, description string, unitOrder int) (*models.LearningUnit, error) {
	// Validate required fields
	if courseID == "" {
		return nil, fmt.Errorf("course ID is required")
	}
	if title == "" {
		return nil, fmt.Errorf("learning unit title is required")
	}

	// Create learning unit object
	learningUnit := &models.LearningUnit{
		CourseID:    uuid.MustParse(courseID),
		Title:       title,
		Description: description,
		UnitOrder:   unitOrder,
	}

	// Save to database
	return s.learningUnitStore.CreateLearningUnit(learningUnit)
}

// GetLearningUnitByID retrieves a learning unit by its ID
func (s *LearningUnitService) GetLearningUnitByID(learningUnitID string) (*models.LearningUnit, error) {
	if learningUnitID == "" {
		return nil, fmt.Errorf("learning unit ID is required")
	}

	return s.learningUnitStore.GetLearningUnitByID(learningUnitID)
}

// GetLearningUnitsByCourseID retrieves learning units for a specific course
func (s *LearningUnitService) GetLearningUnitsByCourseID(courseID string, limit, offset int) ([]*models.LearningUnit, error) {
	if courseID == "" {
		return nil, fmt.Errorf("course ID is required")
	}

	// Set default limit if not provided
	if limit <= 0 {
		limit = 50
	}

	return s.learningUnitStore.GetLearningUnitsByCourseID(courseID, limit, offset)
}

// UpdateLearningUnit handles learning unit update business logic
func (s *LearningUnitService) UpdateLearningUnit(learningUnitID string, updates map[string]interface{}) (*models.LearningUnit, error) {
	if learningUnitID == "" {
		return nil, fmt.Errorf("learning unit ID is required")
	}

	// Validate updates
	if title, exists := updates["title"]; exists {
		if titleStr, ok := title.(string); ok && titleStr == "" {
			return nil, fmt.Errorf("learning unit title cannot be empty")
		}
	}

	return s.learningUnitStore.UpdateLearningUnit(learningUnitID, updates)
}

// DeleteLearningUnit handles learning unit deletion business logic
func (s *LearningUnitService) DeleteLearningUnit(learningUnitID string) error {
	if learningUnitID == "" {
		return fmt.Errorf("learning unit ID is required")
	}

	// Check if learning unit exists before deletion
	_, err := s.learningUnitStore.GetLearningUnitByID(learningUnitID)
	if err != nil {
		return fmt.Errorf("learning unit not found: %w", err)
	}

	return s.learningUnitStore.DeleteLearningUnit(learningUnitID)
}