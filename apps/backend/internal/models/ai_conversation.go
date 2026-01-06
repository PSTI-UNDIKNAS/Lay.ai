package models

import (
	"time"

	"github.com/google/uuid"
)

type AIConversation struct {
	ID                           uuid.UUID   `json:"id" db:"id"`
	UserID                       uuid.UUID   `json:"user_id" db:"user_id"`
	Title                        string      `json:"title" db:"title"`
	KnowledgeBaseCourseIDs       []uuid.UUID `json:"knowledge_base_course_ids" db:"knowledge_base_course_ids"`
	KnowledgeBaseLearningUnitIDs []uuid.UUID `json:"knowledge_base_learning_unit_ids" db:"knowledge_base_learning_unit_ids"`
	CreatedAt                    time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt                    time.Time   `json:"updated_at" db:"updated_at"`
}
