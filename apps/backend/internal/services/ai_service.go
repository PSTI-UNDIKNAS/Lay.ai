package services

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	pdf "github.com/ledongthuc/pdf"
	genai "google.golang.org/genai"

	"lay.ai/backend/internal/store"
)

const defaultChunkSize = 1200   // approx chars per chunk
const defaultChunkOverlap = 200 // overlap between chunks to preserve context
const embeddingModel = "gemini-embedding-001"

// AIService provides PDF ingestion, chunking, and embeddings generation.
type AIService struct {
	store  *store.AIStore
	client *genai.Client
}

func NewAIService(s *store.AIStore) *AIService {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		// Fallback to GOOGLE_API_KEY supported by the SDK
		apiKey = os.Getenv("GOOGLE_API_KEY")
	}
	// Create a client targeting Gemini Developer API
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		// Return service with nil client; methods will surface a friendly error
		return &AIService{store: s, client: nil}
	}
	return &AIService{store: s, client: client}
}

// IngestOptions controls chunking and optional persistence.
type IngestOptions struct {
	DocumentID     string
	CourseID       string
	LearningUnitID string
	ChunkSize      int
	ChunkOverlap   int
}

// ChunkEmbedding is a chunk with its embedding vector.
type ChunkEmbedding struct {
	Content   string    `json:"content"`
	Embedding []float32 `json:"embedding"`
}

// IngestPDF reads a PDF from the repo root, chunks content, embeds using Gemini,
// and optionally persists chunks if DocumentID is provided.
func (s *AIService) IngestPDF(ctx context.Context, fileName string, opts IngestOptions) ([]ChunkEmbedding, error) {
	if fileName == "" {
		return nil, errors.New("file_name is required")
	}

	chunkSize := opts.ChunkSize
	if chunkSize <= 0 {
		chunkSize = defaultChunkSize
	}
	overlap := opts.ChunkOverlap
	if overlap < 0 {
		overlap = defaultChunkOverlap
	}

	// Resolve path to a PDF located at repo root relative to the backend
	pdfPath := resolvePDFPath(fileName)
	content, err := readPDFPlainText(pdfPath)
	if err != nil {
		return nil, err
	}

	chunks := chunkText(content, chunkSize, overlap)
	if len(chunks) == 0 {
		return nil, errors.New("no text extracted from PDF")
	}

	vectors, err := s.embedTexts(ctx, chunks)
	if err != nil {
		return nil, err
	}

	results := make([]ChunkEmbedding, 0, len(chunks))
	for i := range chunks {
		results = append(results, ChunkEmbedding{Content: chunks[i], Embedding: vectors[i]})
	}

	// Persist if a valid DocumentID is provided
	if opts.DocumentID != "" && s.store != nil {
		docID, err := uuid.Parse(opts.DocumentID)
		if err == nil {
			var courseUUIDPtr *uuid.UUID
			var luUUIDPtr *uuid.UUID
			if opts.CourseID != "" {
				if cid, e := uuid.Parse(opts.CourseID); e == nil {
					courseUUIDPtr = &cid
				}
			}
			if opts.LearningUnitID != "" {
				if lid, e := uuid.Parse(opts.LearningUnitID); e == nil {
					luUUIDPtr = &lid
				}
			}
			for i := range results {
				if err := s.store.CreateDocumentChunk(ctx, docID, courseUUIDPtr, luUUIDPtr, results[i].Content, results[i].Embedding); err != nil {
					return nil, fmt.Errorf("persisting chunk %d failed: %w", i, err)
				}
			}
		}
	}

	return results, nil
}

// SearchSimilar embeds a query and returns top-k similar chunks from the DB.
// If documentID is provided, the results are filtered to that document.
func (s *AIService) SearchSimilar(ctx context.Context, query string, topK int, documentID *uuid.UUID) ([]store.SimilarChunk, error) {
	if query == "" {
		return nil, errors.New("query is required")
	}
	if topK <= 0 {
		topK = 5
	}

	vectors, err := s.embedTexts(ctx, []string{query})
	if err != nil {
		return nil, err
	}
	if len(vectors) == 0 {
		return nil, errors.New("embedding failed")
	}

	if documentID != nil {
		return s.store.FindSimilarChunksByDocument(ctx, vectors[0], topK, *documentID)
	}
	return s.store.FindSimilarChunks(ctx, vectors[0], topK)
}

// readPDFPlainText extracts plain text from a PDF using ledongthuc/pdf.
func readPDFPlainText(path string) (string, error) {
	f, r, err := pdf.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()

	var buf bytes.Buffer
	rd, err := r.GetPlainText()
	if err != nil {
		return "", err
	}
	if _, err := buf.ReadFrom(rd); err != nil {
		return "", err
	}
	return buf.String(), nil
}

// chunkText splits text by sentence-like boundaries and assembles chunks
// approx to the target size with overlap.
func chunkText(text string, target, overlap int) []string {
	norm := strings.TrimSpace(text)
	if norm == "" {
		return nil
	}

	// Mark sentence boundaries by placing a sentinel after punctuation followed by whitespace.
	// This keeps the punctuation in the sentence and avoids unsupported lookbehind.
	re := regexp.MustCompile(`([.!?])\s+`)
	marked := re.ReplaceAllString(norm, "$1|")
	// Also break on newline boundaries
	marked = strings.ReplaceAll(marked, "\n", "\n|")

	parts := strings.Split(marked, "|")

	var chunks []string
	var cur strings.Builder

	for _, p := range parts {
		s := strings.TrimSpace(p)
		if s == "" {
			continue
		}
		if cur.Len()+len(s) >= target {
			chunks = append(chunks, cur.String())
			// Build overlap window from the end of the previous chunk
			tail := cur.String()
			if overlap > 0 && len(tail) > overlap {
				start := len(tail) - overlap
				cur.Reset()
				cur.WriteString(tail[start:])
			} else {
				cur.Reset()
			}
		}
		if cur.Len() > 0 {
			cur.WriteString(" ")
		}
		cur.WriteString(s)
	}

	if cur.Len() > 0 {
		chunks = append(chunks, cur.String())
	}

	return chunks
}

// embedTexts calls Gemini embeddings for a batch of texts.
func (s *AIService) embedTexts(ctx context.Context, texts []string) ([][]float32, error) {
	if s.client == nil {
		return nil, errors.New("genai client not initialized; set GEMINI_API_KEY or GOOGLE_API_KEY")
	}
	if len(texts) == 0 {
		return nil, nil
	}

	contents := make([]*genai.Content, 0, len(texts))
	for _, t := range texts {
		contents = append(contents, genai.NewContentFromText(t, genai.RoleUser))
	}

	// Request 768-dim embeddings to match DB schema (vector(768))
	outDim := int32(768)
	res, err := s.client.Models.EmbedContent(ctx, embeddingModel, contents, &genai.EmbedContentConfig{
		OutputDimensionality: &outDim,
	})
	if err != nil {
		return nil, err
	}

	out := make([][]float32, 0, len(res.Embeddings))
	for _, e := range res.Embeddings {
		out = append(out, e.Values)
	}
	return out, nil
}

// resolvePDFPath attempts common locations relative to backend working dir.
// Preferred is repo root: ../../<file> from apps/backend.
func resolvePDFPath(fileName string) string {
	// Absolute path provided
	if filepath.IsAbs(fileName) {
		return fileName
	}
	candidates := []string{
		filepath.Join("..", "..", fileName),       // repo root from apps/backend
		filepath.Join(".", fileName),              // current dir
		filepath.Join("..", fileName),             // apps/
		filepath.Join("..", "..", "..", fileName), // if backend runs from deeper path
	}
	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	// Default to repo root assumption
	return filepath.Join("..", "..", fileName)
}

// AnswerQuery composes a prompt from top-K retrieved chunks and asks the LLM.
// Returns the answer text and the sources used (chunks).
func (s *AIService) AnswerQuery(ctx context.Context, query string, topK int, documentID *uuid.UUID) (string, []store.SimilarChunk, error) {
	if s.client == nil {
		return "", nil, fmt.Errorf("genai client not initialized")
	}

	// Reuse existing retrieval to avoid re-implementing embeddings here.
	results, err := s.SearchSimilar(ctx, query, topK, documentID)
	if err != nil {
		return "", nil, fmt.Errorf("search similar failed: %w", err)
	}

	// Build a compact context block from retrieved chunks.
	var b strings.Builder
	for i, ch := range results {
		// Include chunk ID and document ID to aid source display on the client.
		b.WriteString(fmt.Sprintf("Chunk %d (id=%s, document_id=%s):\n%s\n\n", i, ch.ID.String(), ch.DocumentID.String(), ch.Content))
	}
	contextBlock := b.String()

	// Compose the LLM prompt.
	// Keep it concise and deterministic; ask the model to rely on provided context.
	prompt := fmt.Sprintf(`You are a helpful assistant.
Use ONLY the CONTEXT below to answer the USER QUESTION.
If the context is insufficient, say you do not know.

CONTEXT:
%s

QUESTION:
%s

Answer:`, contextBlock, query)

	// Choose a fast model for Q&A; adjust if you prefer a different one.
	const answerModel = "gemini-2.5-flash"

	resp, err := s.client.Models.GenerateContent(ctx, answerModel, genai.Text(prompt), nil)
	if err != nil {
		return "", results, fmt.Errorf("generate content failed: %w", err)
	}

	answer := resp.Text()
	return answer, results, nil
}