package services

import (
	"context"

	"github.com/google/uuid"
	"lay.ai/backend/internal/store"
)

type DocumentService struct {
	store *store.DocumentStore
}

func NewDocumentService(s *store.DocumentStore) *DocumentService {
	return &DocumentService{store: s}
}

type CreateDocumentParams struct {
	LearningUnitID uuid.UUID
	FileName       string
	StoragePath    string
}

func (s *DocumentService) CreateDocument(ctx context.Context, params CreateDocumentParams) (*store.Document, error) {
	return s.store.CreateDocument(ctx, params.LearningUnitID, params.FileName, params.StoragePath)
}

func (s *DocumentService) GetDocumentByID(ctx context.Context, id uuid.UUID) (*store.Document, error) {
	return s.store.GetDocumentByID(ctx, id)
}

func (s *DocumentService) ListDocumentsByLearningUnit(ctx context.Context, learningUnitID uuid.UUID) ([]store.Document, error) {
	return s.store.ListDocumentsByLearningUnit(ctx, learningUnitID)
}

func (s *DocumentService) DeleteDocument(ctx context.Context, id uuid.UUID) (bool, error) {
	return s.store.DeleteDocument(ctx, id)
}
