package store

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/pgvector/pgvector-go"
)

// AIStore encapsulates operations for RAG chunk storage and similarity search.
type AIStore struct {
	db *pgxpool.Pool
}

func NewAIStore(db *pgxpool.Pool) *AIStore {
	return &AIStore{db: db}
}

// CreateDocumentChunk inserts a chunk and its embedding into document_chunks.
// CourseID and LearningUnitID are optional and may be nil.
func (s *AIStore) CreateDocumentChunk(ctx context.Context, documentID uuid.UUID, courseID *uuid.UUID, learningUnitID *uuid.UUID, content string, embedding []float32) error {
	_, err := s.db.Exec(ctx,
		`INSERT INTO document_chunks (document_id, course_id, learning_unit_id, content, embedding)
         VALUES ($1, $2, $3, $4, $5)`,
		documentID,
		courseID,
		learningUnitID,
		content,
		pgvector.NewVector(embedding),
	)
	return err
}

// SimilarChunk represents a chunk returned from similarity search.
type SimilarChunk struct {
	ID             uuid.UUID  `json:"id"`
	DocumentID     uuid.UUID  `json:"document_id"`
	LearningUnitID *uuid.UUID `json:"learning_unit_id,omitempty"`
	Content        string     `json:"content"`
}

// FindSimilarChunks returns the top-k most similar chunks to the provided embedding
// using cosine distance operator `<=>` against the hnsw index.
func (s *AIStore) FindSimilarChunks(ctx context.Context, embedding []float32, topK int) ([]SimilarChunk, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, document_id, learning_unit_id, content
         FROM document_chunks
         WHERE embedding IS NOT NULL
         ORDER BY embedding <=> $1
         LIMIT $2`,
		pgvector.NewVector(embedding),
		topK,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []SimilarChunk
	for rows.Next() {
		var r SimilarChunk
		if err := rows.Scan(&r.ID, &r.DocumentID, &r.LearningUnitID, &r.Content); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, rows.Err()
}

// FindSimilarChunksByDocument returns the top-k similar chunks filtered by a specific document_id.
func (s *AIStore) FindSimilarChunksByDocument(ctx context.Context, embedding []float32, topK int, documentID uuid.UUID) ([]SimilarChunk, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, document_id, learning_unit_id, content
         FROM document_chunks
         WHERE embedding IS NOT NULL
           AND document_id = $2
         ORDER BY embedding <=> $1
         LIMIT $3`,
		pgvector.NewVector(embedding),
		documentID,
		topK,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []SimilarChunk
	for rows.Next() {
		var r SimilarChunk
		if err := rows.Scan(&r.ID, &r.DocumentID, &r.LearningUnitID, &r.Content); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, rows.Err()
}

// GetChunksByLearningUnits returns chunks for the specified learning unit IDs.
func (s *AIStore) GetChunksByLearningUnits(ctx context.Context, unitIDs []uuid.UUID, limit int) ([]SimilarChunk, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, document_id, learning_unit_id, content
         FROM document_chunks
         WHERE learning_unit_id = ANY($1)
         ORDER BY random()
         LIMIT $2`,
		unitIDs,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []SimilarChunk
	for rows.Next() {
		var r SimilarChunk
		if err := rows.Scan(&r.ID, &r.DocumentID, &r.LearningUnitID, &r.Content); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, rows.Err()
}
