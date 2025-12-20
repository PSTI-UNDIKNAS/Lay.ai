package handlers

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"path/filepath"
	"strings"

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
	OriginalFileName string `json:"originalFileName" binding:"required"`
	NewFileName      string `json:"newFileName" binding:"required"`
	LearningUnitID   string `json:"learningUnitId" binding:"required"`
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

	chunks, err := h.svc.IngestPDF(c.Request.Context(), req.OriginalFileName, req.NewFileName, req.LearningUnitID)
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

// GenerateUploadURLRequest captures the name of the file to be uploaded.
type GenerateUploadURLRequest struct {
	FileName string `json:"fileName" binding:"required"`
}

// GenerateUploadURLResponse returns the presigned URL and the new unique filename for upload.
type GenerateUploadURLResponse struct {
	UploadURL   string `json:"uploadUrl"`
	NewFileName string `json:"newFileName"`
}

// GenerateUploadURLHandler creates a presigned URL for direct client-side uploads to R2.
func (h *AIHandler) GenerateUploadURLHandler(c *gin.Context) {
	var req GenerateUploadURLRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	uploadURL, newFileName, err := h.svc.GeneratePresignedUploadURL(c.Request.Context(), req.FileName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, GenerateUploadURLResponse{
		UploadURL:   uploadURL,
		NewFileName: newFileName,
	})
}

type UploadPDFResponse struct {
	OriginalFileName string `json:"originalFileName"`
	NewFileName      string `json:"newFileName"`
}

func (h *AIHandler) UploadPDFHandler(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}

	if strings.ToLower(filepath.Ext(fileHeader.Filename)) != ".pdf" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only pdf file are accepted"})
		return
	}

	f, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open uploaded file"})
		return
	}
	defer f.Close()

	newFileName, err := h.svc.UploadPDFToR2(c.Request.Context(), fileHeader.Filename, f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, UploadPDFResponse{
		OriginalFileName: fileHeader.Filename,
		NewFileName:      newFileName,
	})
}

func (h *AIHandler) ListUnitDocumentsHandler(c *gin.Context) {
	unitIDStr := c.Param("unitId")
	unitID, err := uuid.Parse(unitIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid unit id"})
		return
	}

	docs, err := h.svc.ListDocumentsByLearningUnit(c.Request.Context(), unitID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"documents": docs})
}

func (h *AIHandler) DownloadDocumentHandler(c *gin.Context) {
	docIDStr := c.Param("documentId")
	docID, err := uuid.Parse(docIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid document id"})
		return
	}

	doc, err := h.svc.GetDocumentByID(c.Request.Context(), docID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if doc == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "document not found"})
		return
	}

	keyPath := doc.StoragePath
	if strings.Contains(keyPath, "://") {
		if u, err := url.Parse(keyPath); err == nil {
			keyPath = u.Path
		}
	}
	key := strings.TrimPrefix(path.Clean(keyPath), "/")
	key = path.Base(key)

	body, err := h.svc.DownloadPDFFromR2(c.Request.Context(), key)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer body.Close()

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=%q", doc.FileName))
	c.Status(http.StatusOK)
	_, _ = io.Copy(c.Writer, body)
}

func (h *AIHandler) DeleteDocumentHandler(c *gin.Context) {
	docIDStr := c.Param("documentId")
	docID, err := uuid.Parse(docIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid document id"})
		return
	}

	deleted, err := h.svc.DeleteDocument(c.Request.Context(), docID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !deleted {
		c.JSON(http.StatusNotFound, gin.H{"error": "document not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "document deleted"})
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
	Lens       string  `json:"lens,omitempty"`        // optional lens
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
	answer, sources, err := h.svc.AnswerQuery(ctx, req.Query, req.Lens, topK, docIDPtr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, AnswerResponse{
		Answer:  answer,
		Sources: sources,
	})
}
