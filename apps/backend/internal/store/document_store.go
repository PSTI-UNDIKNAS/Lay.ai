package store

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
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

func (s *DocumentStore) GetDocumentByID(ctx context.Context, id uuid.UUID) (*Document, error) {
	query := `
		SELECT id, learning_unit_id, file_name, storage_path, created_at, updated_at
		FROM documents
		WHERE id = $1
	`
	var doc Document
	err := s.db.QueryRow(ctx, query, id).Scan(
		&doc.ID,
		&doc.LearningUnitID,
		&doc.FileName,
		&doc.StoragePath,
		&doc.CreatedAt,
		&doc.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &doc, nil
}

func (s *DocumentStore) ListDocumentsByLearningUnit(ctx context.Context, learningUnitID uuid.UUID) ([]Document, error) {
	query := `
		SELECT id, learning_unit_id, file_name, storage_path, created_at, updated_at
		FROM documents
		WHERE learning_unit_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.db.Query(ctx, query, learningUnitID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []Document
	for rows.Next() {
		var doc Document
		if err := rows.Scan(
			&doc.ID,
			&doc.LearningUnitID,
			&doc.FileName,
			&doc.StoragePath,
			&doc.CreatedAt,
			&doc.UpdatedAt,
		); err != nil {
			return nil, err
		}
		docs = append(docs, doc)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return docs, nil
}

func (s *DocumentStore) DeleteDocument(ctx context.Context, id uuid.UUID) (bool, error) {
	result, err := s.db.Exec(ctx, `DELETE FROM documents WHERE id = $1`, id)
	if err != nil {
		return false, err
	}
	return result.RowsAffected() > 0, nil
}

func (s *DocumentStore) CountDocumentsByLearningUnitIDs(ctx context.Context, unitIDs []uuid.UUID) (map[uuid.UUID]int, error) {
	if len(unitIDs) == 0 {
		return map[uuid.UUID]int{}, nil
	}

	query := `
		SELECT learning_unit_id, COUNT(*)
		FROM documents
		WHERE learning_unit_id = ANY($1)
		GROUP BY learning_unit_id
	`

	rows, err := s.db.Query(ctx, query, unitIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to count documents: %w", err)
	}
	defer rows.Close()

	counts := make(map[uuid.UUID]int, len(unitIDs))
	for rows.Next() {
		var unitID uuid.UUID
		var count int
		if err := rows.Scan(&unitID, &count); err != nil {
			return nil, fmt.Errorf("failed to scan document count: %w", err)
		}
		counts[unitID] = count
	}

	return counts, nil
}
