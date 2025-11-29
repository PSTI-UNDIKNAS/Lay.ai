package store

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Document struct {
	ID             uuid.UUID `json:"id"`
	LearningUnitID uuid.UUID `json:"learning_unit_id"`
	FileName       string    `json:"file_name"`
	StoragePath    string    `json:"storage_path"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type DocumentStore struct {
	db *pgxpool.Pool
}

func NewDocumentStore(db *pgxpool.Pool) *DocumentStore {
	return &DocumentStore{db: db}
}

func (s *DocumentStore) CreateDocument(ctx context.Context, learningUnitID uuid.UUID, fileName, storagePath string) (*Document, error) {
	query := `
		INSERT INTO documents (learning_unit_id, file_name, storage_path)
		VALUES ($1, $2, $3)
		RETURNING id, learning_unit_id, file_name, storage_path, created_at, updated_at
	`
	var doc Document
	err := s.db.QueryRow(ctx, query, learningUnitID, fileName, storagePath).Scan(
		&doc.ID,
		&doc.LearningUnitID,
		&doc.FileName,
		&doc.StoragePath,
		&doc.CreatedAt,
		&doc.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &doc, nil
}
