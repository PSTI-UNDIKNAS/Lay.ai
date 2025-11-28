package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"lay.ai/backend/internal/services"
	"lay.ai/backend/internal/store"
)

type AIHandler struct {
	svc *services.AIService
}

func NewAIHandler(svc *services.AIService) *AIHandler {
	return &AIHandler{svc: svc}
}

// IngestRequest captures PDF ingestion parameters.
type IngestRequest struct {
	FileName       string `json:"fileName"`       // PDF file name at repo root
	DocumentID     string `json:"documentId"`     // optional: persist under this document id
	CourseID       string `json:"courseId"`       // optional
	LearningUnitID string `json:"learningUnitId"` // optional
	ChunkSize      int    `json:"chunkSize"`
	ChunkOverlap   int    `json:"chunkOverlap"`
}

// IngestResponse returns chunk contents and their embedding size.
type IngestResponse struct {
	Chunks []struct {
		Content       string `json:"content"`
		EmbeddingSize int    `json:"embeddingSize"`
	} `json:"chunks"`
}

// IngestPDFHandler ingests a PDF, generates embeddings, and optionally persists.
func (h *AIHandler) IngestPDFHandler(c *gin.Context) {
	var req IngestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}
	if req.FileName == "" {
		req.FileName = "document.pdf"
	}

	chunks, err := h.svc.IngestPDF(c.Request.Context(), req.FileName, services.IngestOptions{
		DocumentID:     req.DocumentID,
		CourseID:       req.CourseID,
		LearningUnitID: req.LearningUnitID,
		ChunkSize:      req.ChunkSize,
		ChunkOverlap:   req.ChunkOverlap,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var resp IngestResponse
	for _, ch := range chunks {
		resp.Chunks = append(resp.Chunks, struct {
			Content       string `json:"content"`
			EmbeddingSize int    `json:"embeddingSize"`
		}{Content: ch.Content, EmbeddingSize: len(ch.Embedding)})
	}
	c.JSON(http.StatusOK, resp)
}

// SearchRequest captures query for similarity search.
type SearchRequest struct {
	Query string `json:"query"` // text query
	TopK  int    `json:"topK"`
}

// SearchSimilarHandler embeds the query and returns similar chunks.
func (h *AIHandler) SearchSimilarHandler(c *gin.Context) {
	var req SearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}
	results, err := h.svc.SearchSimilar(c.Request.Context(), req.Query, req.TopK, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"results": results})
}

// AnswerRequest defines the body for /ai/answer.
type AnswerRequest struct {
	Query      string  `json:"query" binding:"required"`
	TopK       *int    `json:"top_k,omitempty"`       // default 5
	DocumentID *string `json:"document_id,omitempty"` // optional filter
}

// AnswerResponse is the result of LLM answering with sources used.
type AnswerResponse struct {
	Answer  string               `json:"answer"`
	Sources []store.SimilarChunk `json:"sources"`
}

// AnswerHandler handles POST /ai/answer
func (h *AIHandler) AnswerHandler(c *gin.Context) {
	var req AnswerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	topK := 5
	if req.TopK != nil && *req.TopK > 0 {
		topK = *req.TopK
	}

	var docIDPtr *uuid.UUID
	if req.DocumentID != nil && *req.DocumentID != "" {
		id, err := uuid.Parse(*req.DocumentID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid document_id"})
			return
		}
		docIDPtr = &id
	}

	ctx := c.Request.Context()
	answer, sources, err := h.svc.AnswerQuery(ctx, req.Query, topK, docIDPtr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, AnswerResponse{
		Answer:  answer,
		Sources: sources,
	})
}