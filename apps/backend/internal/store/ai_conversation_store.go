package store

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"lay.ai/backend/internal/models"
)

type AIConversationStore struct {
	db *pgxpool.Pool
}

func NewAIConversationStore(db *pgxpool.Pool) *AIConversationStore {
	return &AIConversationStore{db: db}
}

func (s *AIConversationStore) ListByUser(ctx context.Context, userID uuid.UUID) ([]*models.AIConversation, error) {
	query := `
		SELECT id, user_id, title, knowledge_base_course_ids, knowledge_base_learning_unit_ids, created_at, updated_at
		FROM ai_conversations
		WHERE user_id = $1
		ORDER BY updated_at DESC
	`

	rows, err := s.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list ai conversations: %w", err)
	}
	defer rows.Close()

	var out []*models.AIConversation
	for rows.Next() {
		var c models.AIConversation
		if err := rows.Scan(&c.ID, &c.UserID, &c.Title, &c.KnowledgeBaseCourseIDs, &c.KnowledgeBaseLearningUnitIDs, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan ai conversation: %w", err)
		}
		out = append(out, &c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate ai conversations: %w", err)
	}

	return out, nil
}

func (s *AIConversationStore) Create(ctx context.Context, userID uuid.UUID, title string) (*models.AIConversation, error) {
	query := `
		INSERT INTO ai_conversations (user_id, title, created_at, updated_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id, user_id, title, knowledge_base_course_ids, knowledge_base_learning_unit_ids, created_at, updated_at
	`

	now := time.Now()
	var c models.AIConversation
	err := s.db.QueryRow(ctx, query, userID, title, now, now).Scan(
		&c.ID,
		&c.UserID,
		&c.Title,
		&c.KnowledgeBaseCourseIDs,
		&c.KnowledgeBaseLearningUnitIDs,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create ai conversation: %w", err)
	}

	return &c, nil
}

func (s *AIConversationStore) Update(ctx context.Context, userID, conversationID uuid.UUID, title *string, knowledgeBaseCourseIDs *[]uuid.UUID, knowledgeBaseLearningUnitIDs *[]uuid.UUID) (*models.AIConversation, error) {
	sets := make([]string, 0, 3)
	args := make([]any, 0, 5)
	idx := 1

	if title != nil {
		sets = append(sets, fmt.Sprintf("title = $%d", idx))
		args = append(args, *title)
		idx++
	}

	if knowledgeBaseCourseIDs != nil {
		sets = append(sets, fmt.Sprintf("knowledge_base_course_ids = $%d", idx))
		args = append(args, *knowledgeBaseCourseIDs)
		idx++
	}

	if knowledgeBaseLearningUnitIDs != nil {
		sets = append(sets, fmt.Sprintf("knowledge_base_learning_unit_ids = $%d", idx))
		args = append(args, *knowledgeBaseLearningUnitIDs)
		idx++
	}

	sets = append(sets, fmt.Sprintf("updated_at = $%d", idx))
	args = append(args, time.Now())
	idx++

	args = append(args, conversationID, userID)

	query := fmt.Sprintf(`
		UPDATE ai_conversations
		SET %s
		WHERE id = $%d AND user_id = $%d
		RETURNING id, user_id, title, knowledge_base_course_ids, knowledge_base_learning_unit_ids, created_at, updated_at
	`, strings.Join(sets, ", "), idx, idx+1)

	var c models.AIConversation
	err := s.db.QueryRow(ctx, query, args...).Scan(
		&c.ID,
		&c.UserID,
		&c.Title,
		&c.KnowledgeBaseCourseIDs,
		&c.KnowledgeBaseLearningUnitIDs,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("conversation not found")
		}
		return nil, fmt.Errorf("failed to update ai conversation: %w", err)
	}

	return &c, nil
}

func (s *AIConversationStore) UpdateTitle(ctx context.Context, userID, conversationID uuid.UUID, title string) (*models.AIConversation, error) {
	return s.Update(ctx, userID, conversationID, &title, nil, nil)
}

func (s *AIConversationStore) Delete(ctx context.Context, userID, conversationID uuid.UUID) error {
	query := `
		DELETE FROM ai_conversations
		WHERE id = $1 AND user_id = $2
	`

	tag, err := s.db.Exec(ctx, query, conversationID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete ai conversation: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("conversation not found")
	}
	return nil
}
