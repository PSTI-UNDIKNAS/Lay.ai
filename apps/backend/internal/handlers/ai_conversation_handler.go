package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"lay.ai/backend/internal/services"
)

type AIConversationHandler struct {
	svc *services.AIConversationService
}

func NewAIConversationHandler(svc *services.AIConversationService) *AIConversationHandler {
	return &AIConversationHandler{svc: svc}
}

func (h *AIConversationHandler) ListConversations(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	userIDStr, ok := userID.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}
	u, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	conversations, err := h.svc.List(c.Request.Context(), u)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch conversations"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"conversations": conversations})
}

func (h *AIConversationHandler) CreateConversation(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	userIDStr, ok := userID.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}
	u, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req struct {
		Title string `json:"title"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	conv, err := h.svc.Create(c.Request.Context(), u, req.Title)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create conversation"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"conversation": conv})
}

func (h *AIConversationHandler) UpdateConversation(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	userIDStr, ok := userID.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}
	u, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	convIDStr := c.Param("conversationId")
	convID, err := uuid.Parse(convIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID"})
		return
	}

	var req struct {
		Title                        *string   `json:"title,omitempty"`
		KnowledgeBaseCourseIDs       *[]string `json:"knowledge_base_course_ids,omitempty"`
		KnowledgeBaseLearningUnitIDs *[]string `json:"knowledge_base_learning_unit_ids,omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if req.Title == nil && req.KnowledgeBaseCourseIDs == nil && req.KnowledgeBaseLearningUnitIDs == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No fields to update"})
		return
	}

	var courseIDs *[]uuid.UUID
	if req.KnowledgeBaseCourseIDs != nil {
		parsed := make([]uuid.UUID, 0, len(*req.KnowledgeBaseCourseIDs))
		for _, idStr := range *req.KnowledgeBaseCourseIDs {
			id, err := uuid.Parse(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
				return
			}
			parsed = append(parsed, id)
		}
		courseIDs = &parsed
	}

	var kbIDs *[]uuid.UUID
	if req.KnowledgeBaseLearningUnitIDs != nil {
		parsed := make([]uuid.UUID, 0, len(*req.KnowledgeBaseLearningUnitIDs))
		for _, idStr := range *req.KnowledgeBaseLearningUnitIDs {
			id, err := uuid.Parse(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid learning unit ID"})
				return
			}
			parsed = append(parsed, id)
		}
		kbIDs = &parsed
	}

	updated, err := h.svc.UpdateConversation(c.Request.Context(), u, convID, req.Title, courseIDs, kbIDs)
	if err != nil {
		if err.Error() == "conversation not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update conversation"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"conversation": updated})
}

func (h *AIConversationHandler) DeleteConversation(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	userIDStr, ok := userID.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}
	u, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	convIDStr := c.Param("conversationId")
	convID, err := uuid.Parse(convIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID"})
		return
	}

	if err := h.svc.Delete(c.Request.Context(), u, convID); err != nil {
		if err.Error() == "conversation not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete conversation"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Conversation deleted"})
}
