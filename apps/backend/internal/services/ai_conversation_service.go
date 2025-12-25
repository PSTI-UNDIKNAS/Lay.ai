package services

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"lay.ai/backend/internal/models"
	"lay.ai/backend/internal/store"
)

type AIConversationService struct {
	store *store.AIConversationStore
}

func NewAIConversationService(store *store.AIConversationStore) *AIConversationService {
	return &AIConversationService{store: store}
}

func (s *AIConversationService) List(ctx context.Context, userID uuid.UUID) ([]*models.AIConversation, error) {
	return s.store.ListByUser(ctx, userID)
}

func (s *AIConversationService) Create(ctx context.Context, userID uuid.UUID, title string) (*models.AIConversation, error) {
	clean := strings.TrimSpace(title)
	if clean == "" {
		clean = "New Conversation"
	}
	return s.store.Create(ctx, userID, clean)
}

func (s *AIConversationService) UpdateTitle(ctx context.Context, userID, conversationID uuid.UUID, title string) (*models.AIConversation, error) {
	clean := strings.TrimSpace(title)
	if clean == "" {
		clean = "Untitled"
	}
	return s.store.UpdateTitle(ctx, userID, conversationID, clean)
}

func (s *AIConversationService) UpdateConversation(ctx context.Context, userID, conversationID uuid.UUID, title *string, knowledgeBaseCourseIDs *[]uuid.UUID, knowledgeBaseLearningUnitIDs *[]uuid.UUID) (*models.AIConversation, error) {
	var cleanedTitle *string
	if title != nil {
		clean := strings.TrimSpace(*title)
		if clean == "" {
			clean = "Untitled"
		}
		cleanedTitle = &clean
	}

	return s.store.Update(ctx, userID, conversationID, cleanedTitle, knowledgeBaseCourseIDs, knowledgeBaseLearningUnitIDs)
}

func (s *AIConversationService) Delete(ctx context.Context, userID, conversationID uuid.UUID) error {
	return s.store.Delete(ctx, userID, conversationID)
}
