package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"lay.ai/backend/internal/services"
)

type AdminHandler struct {
	adminService *services.AdminService
}

func NewAdminHandler(adminService *services.AdminService) *AdminHandler {
	return &AdminHandler{
		adminService: adminService,
	}
}

// GetPendingLecturersResponse represents the response for getting pending lecturers
type GetPendingLecturersResponse struct {
	Lecturers []LecturerInfo `json:"lecturers"`
	Count     int            `json:"count"`
}

// LecturerInfo represents lecturer information for admin view
type LecturerInfo struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	Email            string `json:"email"`
	UniqueIdentifier string `json:"unique_identifier"`
	CreatedAt        string `json:"created_at"`
}

// ApproveLecturerResponse represents the response for approving a lecturer
type ApproveLecturerResponse struct {
	Message string `json:"message"`
	Success bool   `json:"success"`
}

// GetPendingLecturers handles GET /api/admin/lecturers?status=pending_approval
func (h *AdminHandler) GetPendingLecturers(c *gin.Context) {
	// Check if status query parameter is provided and equals "pending_approval"
	status := c.Query("status")
	if status != "pending_approval" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "status parameter must be 'pending_approval'",
		})
		return
	}

	lecturers, err := h.adminService.GetPendingLecturers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve pending lecturers",
		})
		return
	}

	// Convert to response format
	lecturerInfos := make([]LecturerInfo, len(lecturers))
	for i, lecturer := range lecturers {
		lecturerInfos[i] = LecturerInfo{
			ID:               lecturer.ID.String(),
			Name:             lecturer.Name,
			Email:            lecturer.Email,
			UniqueIdentifier: lecturer.UniqueIdentifier,
			CreatedAt:        lecturer.CreatedAt.Format("2006-01-02T15:04:05Z"),
		}
	}

	response := GetPendingLecturersResponse{
		Lecturers: lecturerInfos,
		Count:     len(lecturerInfos),
	}

	c.JSON(http.StatusOK, response)
}

// ApproveLecturer handles POST /api/admin/lecturers/{lecturerId}/approve
func (h *AdminHandler) ApproveLecturer(c *gin.Context) {
	lecturerID := c.Param("lecturerId")
	if lecturerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "lecturer ID is required",
		})
		return
	}

	err := h.adminService.ApproveLecturer(lecturerID)
	if err != nil {
		// Check for specific error types
		switch err.Error() {
		case "user is not a lecturer":
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "User is not a lecturer",
			})
			return
		case "lecturer is not in pending approval status":
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Lecturer is not in pending approval status",
			})
			return
		default:
			if err.Error() == "failed to get user: user not found" {
				c.JSON(http.StatusNotFound, gin.H{
					"error": "Lecturer not found",
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to approve lecturer",
			})
			return
		}
	}

	response := ApproveLecturerResponse{
		Message: "Lecturer approved successfully",
		Success: true,
	}

	c.JSON(http.StatusOK, response)
}