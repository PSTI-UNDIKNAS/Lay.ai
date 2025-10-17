package services

import (
	"fmt"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"lay.ai/backend/internal/models"
	"lay.ai/backend/internal/store"
)

// EnrollmentService handles enrollment-related business logic
type EnrollmentService struct {
	enrollmentStore *store.EnrollmentStore
	courseStore     *store.CourseStore
}

// NewEnrollmentService creates a new EnrollmentService
func NewEnrollmentService(enrollmentStore *store.EnrollmentStore, courseStore *store.CourseStore) *EnrollmentService {
	return &EnrollmentService{
		enrollmentStore: enrollmentStore,
		courseStore:     courseStore,
	}
}

// JoinCourse handles student joining a course
func (s *EnrollmentService) JoinCourse(studentID, courseID uuid.UUID, password string) (*models.Enrollment, error) {
	// Get course details
	course, err := s.courseStore.GetCourseByID(courseID.String())
	if err != nil {
		return nil, fmt.Errorf("course not found")
	}

	// Check access type and validate accordingly
	switch course.AccessType {
	case models.AccessTypePublic:
		// No additional validation needed
	case models.AccessTypePassword:
		if password == "" {
			return nil, fmt.Errorf("password is required for this course")
		}
		// Verify password
		err := bcrypt.CompareHashAndPassword([]byte(course.PasswordHash), []byte(password))
		if err != nil {
			return nil, fmt.Errorf("invalid password")
		}
	case models.AccessTypeByRequest:
		return nil, fmt.Errorf("this course requires approval - use request access instead")
	}

	// Check if already enrolled
	existingEnrollment, _ := s.enrollmentStore.GetEnrollmentByStudentAndCourse(studentID.String(), courseID.String())
	if existingEnrollment != nil {
		return nil, fmt.Errorf("already enrolled in this course")
	}

	// Create enrollment
	enrollment := &models.Enrollment{
		StudentID: studentID,
		CourseID:  courseID,
		Status:    models.EnrollmentStatusEnrolled,
	}

	return s.enrollmentStore.CreateEnrollment(enrollment)
}

// RequestAccess handles student requesting access to a course
func (s *EnrollmentService) RequestAccess(studentID, courseID uuid.UUID) (*models.Enrollment, error) {
	// Get course details
	course, err := s.courseStore.GetCourseByID(courseID.String())
	if err != nil {
		return nil, fmt.Errorf("course not found")
	}

	// Only allow requests for by_request courses
	if course.AccessType != models.AccessTypeByRequest {
		return nil, fmt.Errorf("this course does not require approval")
	}

	// Check if already has a pending request or is enrolled
	existingEnrollment, _ := s.enrollmentStore.GetEnrollmentByStudentAndCourse(studentID.String(), courseID.String())
	if existingEnrollment != nil {
		if existingEnrollment.Status == models.EnrollmentStatusPendingApproval {
			return nil, fmt.Errorf("access request already pending")
		}
		if existingEnrollment.Status == models.EnrollmentStatusEnrolled {
			return nil, fmt.Errorf("already enrolled in this course")
		}
	}

	// Create enrollment request
	enrollment := &models.Enrollment{
		StudentID: studentID,
		CourseID:  courseID,
		Status:    models.EnrollmentStatusPendingApproval,
	}

	return s.enrollmentStore.CreateEnrollment(enrollment)
}

// GetAccessRequests retrieves pending access requests for a course
func (s *EnrollmentService) GetAccessRequests(courseID uuid.UUID) ([]*models.Enrollment, error) {
	status := models.EnrollmentStatusPendingApproval
	courseIDStr := courseID.String()
	return s.enrollmentStore.GetEnrollments(nil, &courseIDStr, &status, 50, 0)
}

// ApproveAccessRequest handles lecturer approving/denying access requests
func (s *EnrollmentService) ApproveAccessRequest(lecturerID, requestID uuid.UUID, approved bool) error {
	// Get the enrollment request
	enrollment, err := s.enrollmentStore.GetEnrollmentByID(requestID.String())
	if err != nil {
		return fmt.Errorf("access request not found")
	}

	// Verify lecturer owns the course
	course, err := s.courseStore.GetCourseByID(enrollment.CourseID.String())
	if err != nil {
		return fmt.Errorf("course not found")
	}

	if course.CreatorID != lecturerID {
		return fmt.Errorf("access denied - not course owner")
	}

	// Update enrollment status
	var newStatus models.EnrollmentStatus
	if approved {
		newStatus = models.EnrollmentStatusEnrolled
	} else {
		newStatus = models.EnrollmentStatusDenied
	}

	updates := map[string]interface{}{
		"status": newStatus,
	}

	return s.enrollmentStore.UpdateEnrollment(requestID.String(), updates)
}

// GetEnrollmentsByStudent retrieves all enrollments for a specific student
func (s *EnrollmentService) GetEnrollmentsByStudent(studentID string) ([]*models.Enrollment, error) {
	return s.enrollmentStore.GetEnrollments(&studentID, nil, nil, 50, 0)
}

// UnenrollFromCourse handles student unenrolling from a course
func (s *EnrollmentService) UnenrollFromCourse(studentID, courseID uuid.UUID) error {
	// Check if enrolled
	enrollment, err := s.enrollmentStore.GetEnrollmentByStudentAndCourse(studentID.String(), courseID.String())
	if err != nil {
		return fmt.Errorf("enrollment not found")
	}

	if enrollment.Status != models.EnrollmentStatusEnrolled {
		return fmt.Errorf("not enrolled in this course")
	}

	// Delete enrollment
	return s.enrollmentStore.DeleteEnrollment(enrollment.ID.String())
}