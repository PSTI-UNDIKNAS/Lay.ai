package services

import (
	"fmt"

	"github.com/google/uuid"
	"lay.ai/backend/internal/models"
	"lay.ai/backend/internal/store"
)

// CourseService handles course-related business logic
type CourseService struct {
	courseStore *store.CourseStore
}

// NewCourseService creates a new CourseService
func NewCourseService(courseStore *store.CourseStore) *CourseService {
	return &CourseService{
		courseStore: courseStore,
	}
}

// CreateCourse handles course creation business logic
func (s *CourseService) CreateCourse(title, description string, creatorID string, accessType models.AccessType) (*models.Course, error) {
	// Validate required fields
	if title == "" {
		return nil, fmt.Errorf("course title is required")
	}
	if creatorID == "" {
		return nil, fmt.Errorf("creator ID is required")
	}

	// Create course object
	course := &models.Course{
		Title:       title,
		Description: description,
		CreatorID:   uuid.MustParse(creatorID),
		AccessType:  accessType,
	}

	// Save to database
	return s.courseStore.CreateCourse(course)
}

// GetCourseByID retrieves a course by its ID
func (s *CourseService) GetCourseByID(courseID string) (*models.Course, error) {
	if courseID == "" {
		return nil, fmt.Errorf("course ID is required")
	}

	return s.courseStore.GetCourseByID(courseID)
}

// GetCourses retrieves courses with optional filtering
func (s *CourseService) GetCourses(creatorID *string, limit, offset int) ([]*models.Course, error) {
	// Set default limit if not provided
	if limit <= 0 {
		limit = 50
	}

	return s.courseStore.GetCourses(creatorID, limit, offset)
}

// UpdateCourse handles course update business logic
func (s *CourseService) UpdateCourse(courseID string, updates map[string]interface{}) (*models.Course, error) {
	if courseID == "" {
		return nil, fmt.Errorf("course ID is required")
	}

	// Validate updates
	if title, exists := updates["title"]; exists {
		if titleStr, ok := title.(string); ok && titleStr == "" {
			return nil, fmt.Errorf("course title cannot be empty")
		}
	}

	return s.courseStore.UpdateCourse(courseID, updates)
}

// DeleteCourse handles course deletion business logic
func (s *CourseService) DeleteCourse(courseID string) error {
	if courseID == "" {
		return fmt.Errorf("course ID is required")
	}

	// Check if course exists before deletion
	_, err := s.courseStore.GetCourseByID(courseID)
	if err != nil {
		return fmt.Errorf("course not found: %w", err)
	}

	return s.courseStore.DeleteCourse(courseID)
}

// GetEnrollments retrieves enrollments for a course
func (s *CourseService) GetEnrollments(studentID, courseID *string, status *models.EnrollmentStatus, limit, offset int) ([]*models.Enrollment, error) {
	// Set default limit if not provided
	if limit <= 0 {
		limit = 50
	}

	return s.courseStore.GetEnrollments(studentID, courseID, status, limit, offset)
}

// DeleteEnrollment handles enrollment deletion business logic
func (s *CourseService) DeleteEnrollment(enrollmentID string) error {
	if enrollmentID == "" {
		return fmt.Errorf("enrollment ID is required")
	}

	return s.courseStore.DeleteEnrollment(enrollmentID)
}