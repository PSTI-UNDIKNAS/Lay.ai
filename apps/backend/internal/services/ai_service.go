package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/url"
	"os"
	"path"
	"regexp"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	v4 "github.com/aws/aws-sdk-go-v2/aws/signer/v4"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
	pdf "github.com/ledongthuc/pdf"
	genai "google.golang.org/genai"

	"lay.ai/backend/internal/models"
	"lay.ai/backend/internal/store"
)

const defaultChunkSize = 1200   // approx chars per chunk
const defaultChunkOverlap = 200 // overlap between chunks to preserve context
const embeddingModel = "gemini-embedding-001"
const generativeModel = "gemini-3-flash-preview"
const presignedURLExpiry = 15 * time.Minute

var AvailableLenses = map[string]string{
	"feynman":      "Jelaskan dengan analogi sederhana dan intuitif seperti Richard Feynman. Hindari jargon rumit.",
	"practitioner": "Fokus pada penerapan praktis, langkah-langkah implementasi, dan studi kasus dunia nyata.",
	"academic":     "Gunakan nada akademis formal, definisikan istilah dengan presisi, dan fokus pada teori fundamental.",
	"default":      "Jawab dengan jelas, membantu, dan langsung pada intinya.",
}

// AIService provides PDF ingestion, chunking, and embeddings generation.
type AIService struct {
	store         *store.AIStore
	genStore      *store.GeneratedContentStore
	docSvc        *DocumentService
	client        *genai.Client
	s3Client      *s3.Client
	presignClient *s3.PresignClient
	r2BucketName  string
	r2PublicURL   string
}

func NewAIService(s *store.AIStore, genStore *store.GeneratedContentStore, docSvc *DocumentService) *AIService {
	// Init Gemini Client
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("GOOGLE_API_KEY")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	gclient, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		gclient = nil // Service methods will handle nil client
	}

	// Init R2/S3 Client
	accountID := os.Getenv("R2_ACCOUNT_ID")
	accessKeyID := os.Getenv("R2_ACCESS_KEY_ID")
	accessKeySecret := os.Getenv("R2_SECRET_ACCESS_KEY")
	bucketName := os.Getenv("R2_BUCKET_NAME")
	publicURL := os.Getenv("R2_PUBLIC_URL")

	r2Resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL:               fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID),
			HostnameImmutable: true,
			Source:            aws.EndpointSourceCustom,
		}, nil
	})

	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion("auto"),
		config.WithEndpointResolverWithOptions(r2Resolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKeyID, accessKeySecret, "")),
	)
	if err != nil {
		// Return service with nil clients; methods will surface friendly errors
		return &AIService{store: s, docSvc: docSvc, client: gclient}
	}

	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.APIOptions = append(o.APIOptions, v4.SwapComputePayloadSHA256ForUnsignedPayloadMiddleware)
	})
	presignClient := s3.NewPresignClient(s3Client)

	return &AIService{
		store:         s,
		genStore:      genStore,
		docSvc:        docSvc,
		client:        gclient,
		s3Client:      s3Client,
		presignClient: presignClient,
		r2BucketName:  bucketName,
		r2PublicURL:   publicURL,
	}
}

// GeneratePresignedUploadURL creates a temporary URL for a client to upload a file directly to R2.
// It generates a unique filename to prevent collisions.
func (s *AIService) GeneratePresignedUploadURL(ctx context.Context, originalFileName string) (string, string, error) {
	if s.presignClient == nil {
		return "", "", errors.New("R2/S3 client not initialized")
	}

	// Generate a new UUID and preserve the original file extension.
	newID := uuid.New().String()
	fileExtension := path.Ext(originalFileName)
	newFileName := fmt.Sprintf("%s%s", newID, fileExtension)

	req, err := s.presignClient.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.r2BucketName),
		Key:         aws.String(newFileName),
		ContentType: aws.String("application/pdf"),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = presignedURLExpiry
	})
	if err != nil {
		return "", "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	return req.URL, newFileName, nil
}

func (s *AIService) UploadPDFToR2(ctx context.Context, originalFileName string, body io.Reader) (string, error) {
	if s.s3Client == nil {
		return "", errors.New("R2/S3 client not initialized")
	}

	newID := uuid.New().String()
	fileExtension := strings.ToLower(path.Ext(originalFileName))
	if fileExtension != ".pdf" {
		fileExtension = ".pdf"
	}
	newFileName := fmt.Sprintf("%s%s", newID, fileExtension)

	_, err := s.s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.r2BucketName),
		Key:         aws.String(newFileName),
		Body:        body,
		ContentType: aws.String("application/pdf"),
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload file: %w", err)
	}

	return newFileName, nil
}

func (s *AIService) GetDocumentByID(ctx context.Context, id uuid.UUID) (*store.Document, error) {
	if s.docSvc == nil {
		return nil, errors.New("document service not initialized")
	}
	return s.docSvc.GetDocumentByID(ctx, id)
}

func (s *AIService) ListDocumentsByLearningUnit(ctx context.Context, learningUnitID uuid.UUID) ([]store.Document, error) {
	if s.docSvc == nil {
		return nil, errors.New("document service not initialized")
	}
	return s.docSvc.ListDocumentsByLearningUnit(ctx, learningUnitID)
}

func (s *AIService) DeleteDocument(ctx context.Context, documentID uuid.UUID) (bool, error) {
	if s.docSvc == nil {
		return false, errors.New("document service not initialized")
	}
	if s.s3Client == nil {
		return false, errors.New("S3 client not initialized")
	}

	doc, err := s.docSvc.GetDocumentByID(ctx, documentID)
	if err != nil {
		return false, err
	}
	if doc == nil {
		return false, nil
	}

	key := extractR2Key(doc.StoragePath)
	if key == "" {
		return false, errors.New("invalid storage path")
	}

	if _, err := s.s3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.r2BucketName),
		Key:    aws.String(key),
	}); err != nil {
		return false, err
	}

	if err := s.store.DeleteChunksByDocument(ctx, documentID); err != nil {
		return false, err
	}

	return s.docSvc.DeleteDocument(ctx, documentID)
}

func (s *AIService) DownloadPDFFromR2(ctx context.Context, key string) (io.ReadCloser, error) {
	if s.s3Client == nil {
		return nil, errors.New("S3 client not initialized")
	}
	if key == "" {
		return nil, errors.New("key is required")
	}
	out, err := s.s3Client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.r2BucketName),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, err
	}
	return out.Body, nil
}

func extractR2Key(storagePath string) string {
	keyPath := storagePath
	if strings.Contains(keyPath, "://") {
		if u, err := url.Parse(keyPath); err == nil {
			keyPath = u.Path
		}
	}
	key := strings.TrimPrefix(path.Clean(keyPath), "/")
	return path.Base(key)
}

// ChunkEmbedding is a chunk with its embedding vector.
type ChunkEmbedding struct {
	Content   string    `json:"content"`
	Embedding []float32 `json:"embedding"`
}

// GeneratedQuestion represents a question generated by AI
type GeneratedQuestion struct {
	Question    string   `json:"question"`
	Options     []string `json:"options"`
	Answer      string   `json:"answer"`
	Explanation string   `json:"explanation"`
	Points      int      `json:"points"`
}

// GeneratedQuizResponse represents the generated quiz
type GeneratedQuizResponse struct {
	ID            uuid.UUID           `json:"id"`
	Title         string              `json:"title"`
	Questions     []GeneratedQuestion `json:"questions"`
	SourceUnitIDs []uuid.UUID         `json:"source_unit_ids"`
}

// GeneratedFlashcard represents a flashcard generated by AI
type GeneratedFlashcard struct {
	Front string `json:"front"`
	Back  string `json:"back"`
}

// GeneratedFlashcardSetResponse represents the generated flashcard set
type GeneratedFlashcardSetResponse struct {
	ID            uuid.UUID            `json:"id"`
	Title         string               `json:"title"`
	Flashcards    []GeneratedFlashcard `json:"flashcards"`
	SourceUnitIDs []uuid.UUID          `json:"source_unit_ids"`
}

type GenerateQuizOptions struct {
	QuestionCount int
	Context       string
	Difficulty    string
}

type GenerateFlashcardsOptions struct {
	FlashcardCount int
	Context        string
}

// GenerateQuiz generates a quiz based on the content of the provided learning units.
func (s *AIService) GenerateQuiz(ctx context.Context, userID, courseID uuid.UUID, unitIDs []uuid.UUID, opts GenerateQuizOptions) (*GeneratedQuizResponse, error) {
	if len(unitIDs) == 0 {
		return nil, errors.New("no learning units provided")
	}
	if opts.QuestionCount <= 0 {
		opts.QuestionCount = 5
	}
	if opts.QuestionCount > 20 {
		return nil, errors.New("question count must be between 1 and 20")
	}

	// 1. Fetch relevant content chunks
	// Limit to 15 chunks to fit in context window while providing good coverage
	chunks, err := s.store.GetChunksByLearningUnits(ctx, unitIDs, 15)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch content chunks: %w", err)
	}
	if len(chunks) == 0 {
		return nil, errors.New("no content available for the selected learning units")
	}

	// 2. Construct the prompt
	var contentBuilder strings.Builder
	for _, chunk := range chunks {
		contentBuilder.WriteString(chunk.Content)
		contentBuilder.WriteString("\n---\n")
	}

	contextLine := ""
	if strings.TrimSpace(opts.Context) != "" {
		contextLine = fmt.Sprintf("Focus on this specific context (if relevant): %s\n\n", strings.TrimSpace(opts.Context))
	}
	difficultyLine := ""
	if strings.TrimSpace(opts.Difficulty) != "" {
		difficultyLine = fmt.Sprintf("Difficulty: %s\n\n", strings.TrimSpace(opts.Difficulty))
	}

	prompt := fmt.Sprintf(`
You are an expert educational AI. Generate a quiz based on the following content.
The quiz should test understanding of the key concepts found in the text.

Content:
%s

%s%sInstructions:
1. Generate %d multiple-choice questions.
2. Each question must have 4 options.
3. Provide the correct answer (must be one of the options).
4. Provide a brief explanation for the correct answer.
5. Provide a short, descriptive title for the quiz based on the content.
6. Output strictly valid JSON matching this structure:
{
  "title": "Quiz Title",
  "questions": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "answer": "The correct option text",
      "explanation": "...",
      "points": 1
    }
  ]
}
Do not include any markdown formatting (like backtick json) in the response. Just the raw JSON.
`, contentBuilder.String(), contextLine, difficultyLine, opts.QuestionCount)

	// 3. Call Gemini
	if s.client == nil {
		return nil, errors.New("AI client not initialized")
	}

	temperature := float32(0.3)
	resp, err := s.client.Models.GenerateContent(ctx, generativeModel, genai.Text(prompt), &genai.GenerateContentConfig{
		Temperature: &temperature,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to generate quiz content: %w", err)
	}

	// 4. Parse response
	partText := resp.Text()

	// Clean up markdown code blocks if present (despite instructions)
	partText = strings.TrimPrefix(partText, "```json")
	partText = strings.TrimPrefix(partText, "```")
	partText = strings.TrimSuffix(partText, "```")
	partText = strings.TrimSpace(partText)

	var quizResp GeneratedQuizResponse
	if err := json.Unmarshal([]byte(partText), &quizResp); err != nil {
		return nil, fmt.Errorf("failed to parse generated quiz JSON: %w. Response: %s", err, partText)
	}

	// Collect unique learning unit IDs from the chunks that were actually used
	usedUnitIDs := make(map[uuid.UUID]struct{})
	for _, chunk := range chunks {
		if chunk.LearningUnitID != nil {
			usedUnitIDs[*chunk.LearningUnitID] = struct{}{}
		}
	}

	quizResp.SourceUnitIDs = make([]uuid.UUID, 0, len(usedUnitIDs))
	for id := range usedUnitIDs {
		quizResp.SourceUnitIDs = append(quizResp.SourceUnitIDs, id)
	}

	// 5. Save the generated quiz to the database
	if s.genStore != nil {
		// Serialize questions to JSON
		quizDataBytes, err := json.Marshal(quizResp) // Contains questions and title
		if err != nil {
			return nil, fmt.Errorf("failed to marshal quiz data: %w", err)
		}

		generatedQuiz := &models.GeneratedQuiz{
			ID:            uuid.New(),
			UserID:        userID,
			CourseID:      courseID,
			Title:         quizResp.Title,
			QuizData:      json.RawMessage(quizDataBytes),
			SourceUnitIDs: quizResp.SourceUnitIDs,
		}

		if err := s.genStore.CreateGeneratedQuiz(ctx, generatedQuiz); err != nil {
			return nil, fmt.Errorf("failed to save generated quiz: %w", err)
		}

		quizResp.ID = generatedQuiz.ID
	}

	return &quizResp, nil
}

// GenerateFlashcards generates flashcards based on the content of the provided learning units.
func (s *AIService) GenerateFlashcards(ctx context.Context, userID, courseID uuid.UUID, unitIDs []uuid.UUID, opts GenerateFlashcardsOptions) (*GeneratedFlashcardSetResponse, error) {
	if len(unitIDs) == 0 {
		return nil, errors.New("no learning units provided")
	}
	if opts.FlashcardCount <= 0 {
		opts.FlashcardCount = 10
	}
	if opts.FlashcardCount > 20 {
		return nil, errors.New("flashcard count must be between 1 and 20")
	}

	// 1. Fetch relevant content chunks
	// Limit to 15 chunks to fit in context window while providing good coverage
	chunks, err := s.store.GetChunksByLearningUnits(ctx, unitIDs, 15)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch content chunks: %w", err)
	}
	if len(chunks) == 0 {
		return nil, errors.New("no content available for the selected learning units")
	}

	// 2. Construct the prompt
	var contentBuilder strings.Builder
	for _, chunk := range chunks {
		contentBuilder.WriteString(chunk.Content)
		contentBuilder.WriteString("\n---\n")
	}

	flashcardContextLine := ""
	if strings.TrimSpace(opts.Context) != "" {
		flashcardContextLine = fmt.Sprintf("Focus on this specific context (if relevant): %s\n\n", strings.TrimSpace(opts.Context))
	}

	prompt := fmt.Sprintf(`
You are an expert educational AI. Generate a set of flashcards based on the following content.
The flashcards should help students memorize key concepts, definitions, and facts found in the text.

Content:
%s

%sInstructions:
1. Generate %d flashcards.
2. Each flashcard must have a "front" (question/term) and a "back" (answer/definition).
3. The front should be concise.
4. The back should be accurate and easy to understand.
5. Provide a short, descriptive title for the flashcard set based on the content.
6. Output strictly valid JSON matching this structure:
{
  "title": "Flashcard Set Title",
  "flashcards": [
    {
      "front": "...",
      "back": "..."
    }
  ]
}
Do not include any markdown formatting (like backtick json) in the response. Just the raw JSON.
`, contentBuilder.String(), flashcardContextLine, opts.FlashcardCount)

	// 3. Call Gemini
	if s.client == nil {
		return nil, errors.New("AI client not initialized")
	}

	temperature := float32(0.3)
	resp, err := s.client.Models.GenerateContent(ctx, generativeModel, genai.Text(prompt), &genai.GenerateContentConfig{
		Temperature: &temperature,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to generate flashcard content: %w", err)
	}

	// 4. Parse response
	partText := resp.Text()

	// Clean up markdown code blocks if present
	partText = strings.TrimPrefix(partText, "```json")
	partText = strings.TrimPrefix(partText, "```")
	partText = strings.TrimSuffix(partText, "```")
	partText = strings.TrimSpace(partText)

	var flashcardResp GeneratedFlashcardSetResponse
	if err := json.Unmarshal([]byte(partText), &flashcardResp); err != nil {
		return nil, fmt.Errorf("failed to parse generated flashcards JSON: %w. Response: %s", err, partText)
	}

	// Collect unique learning unit IDs from the chunks that were actually used
	usedUnitIDs := make(map[uuid.UUID]struct{})
	for _, chunk := range chunks {
		if chunk.LearningUnitID != nil {
			usedUnitIDs[*chunk.LearningUnitID] = struct{}{}
		}
	}

	flashcardResp.SourceUnitIDs = make([]uuid.UUID, 0, len(usedUnitIDs))
	for id := range usedUnitIDs {
		flashcardResp.SourceUnitIDs = append(flashcardResp.SourceUnitIDs, id)
	}

	// 5. Save the generated flashcard set to the database
	if s.genStore != nil {
		// Serialize flashcards to JSON
		flashcardsDataBytes, err := json.Marshal(flashcardResp) // Contains flashcards and title
		if err != nil {
			return nil, fmt.Errorf("failed to marshal flashcards data: %w", err)
		}

		generatedSet := &models.GeneratedFlashcardSet{
			ID:             uuid.New(),
			UserID:         userID,
			CourseID:       courseID,
			Title:          flashcardResp.Title,
			FlashcardsData: json.RawMessage(flashcardsDataBytes),
			SourceUnitIDs:  flashcardResp.SourceUnitIDs,
		}

		if err := s.genStore.CreateGeneratedFlashcardSet(ctx, generatedSet); err != nil {
			return nil, fmt.Errorf("failed to save generated flashcard set: %w", err)
		}

		flashcardResp.ID = generatedSet.ID
	}

	return &flashcardResp, nil
}

func (s *AIService) ListGeneratedFlashcardSets(ctx context.Context, userID, courseID uuid.UUID) ([]models.GeneratedFlashcardSet, error) {
	if s.genStore == nil {
		return nil, errors.New("generated content store not initialized")
	}
	return s.genStore.GetGeneratedFlashcardSetsByUserAndCourseID(ctx, userID, courseID)
}

func (s *AIService) GetGeneratedFlashcardSet(ctx context.Context, userID, courseID, setID uuid.UUID) (*models.GeneratedFlashcardSet, error) {
	if s.genStore == nil {
		return nil, errors.New("generated content store not initialized")
	}
	set, err := s.genStore.GetGeneratedFlashcardSetByID(ctx, setID)
	if err != nil {
		return nil, err
	}
	if set.UserID != userID || set.CourseID != courseID {
		return nil, errors.New("generated flashcard set not found")
	}
	return set, nil
}

func (s *AIService) DeleteGeneratedFlashcardSet(ctx context.Context, userID, courseID, setID uuid.UUID) error {
	if s.genStore == nil {
		return errors.New("generated content store not initialized")
	}
	return s.genStore.DeleteGeneratedFlashcardSet(ctx, setID, userID, courseID)
}

func (s *AIService) ListGeneratedQuizzes(ctx context.Context, userID, courseID uuid.UUID) ([]models.GeneratedQuiz, error) {
	if s.genStore == nil {
		return nil, errors.New("generated content store not initialized")
	}
	return s.genStore.GetGeneratedQuizzesByUserAndCourseID(ctx, userID, courseID)
}

func (s *AIService) GetGeneratedQuiz(ctx context.Context, userID, courseID, quizID uuid.UUID) (*models.GeneratedQuiz, error) {
	if s.genStore == nil {
		return nil, errors.New("generated content store not initialized")
	}
	quiz, err := s.genStore.GetGeneratedQuizByID(ctx, quizID)
	if err != nil {
		return nil, err
	}
	if quiz.UserID != userID || quiz.CourseID != courseID {
		return nil, errors.New("generated quiz not found")
	}
	return quiz, nil
}

func (s *AIService) DeleteGeneratedQuiz(ctx context.Context, userID, courseID, quizID uuid.UUID) error {
	if s.genStore == nil {
		return errors.New("generated content store not initialized")
	}
	return s.genStore.DeleteGeneratedQuiz(ctx, quizID, userID, courseID)
}

// IngestPDF downloads a PDF from R2, creates a document record, chunks content,
// embeds using Gemini, and persists the chunks.
func (s *AIService) IngestPDF(ctx context.Context, originalFileName, newFileName, learningUnitIDStr string) ([]ChunkEmbedding, error) {
	if newFileName == "" {
		return nil, errors.New("new_file_name is required")
	}
	if originalFileName == "" {
		return nil, errors.New("original_file_name is required")
	}
	luID, err := uuid.Parse(learningUnitIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid learning_unit_id: %w", err)
	}

	// Step 1: Download the PDF from R2 using the authenticated S3 client and the unique name.
	// This is done BEFORE creating a database record to ensure the file exists.
	if s.s3Client == nil {
		return nil, errors.New("S3 client not initialized")
	}
	getObjectOutput, err := s.s3Client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.r2BucketName),
		Key:    aws.String(newFileName),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to download PDF from R2: %w", err)
	}
	defer getObjectOutput.Body.Close()

	pdfBytes, err := io.ReadAll(getObjectOutput.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read PDF body: %w", err)
	}

	// Step 2: Now that the file is confirmed to exist, create the document record.
	storagePath := fmt.Sprintf("%s/%s", s.r2PublicURL, newFileName)
	doc, err := s.docSvc.CreateDocument(ctx, CreateDocumentParams{
		LearningUnitID: luID,
		FileName:       originalFileName,
		StoragePath:    storagePath,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create document record: %w", err)
	}

	content, err := readPDFPlainText(pdfBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to read PDF content: %w", err)
	}
	// Sanitize the extracted text to remove/replace invalid UTF-8 sequences and null bytes.
	content = sanitizeString(content)

	// Step 3: Process the downloaded content.
	chunks := chunkText(content, defaultChunkSize, defaultChunkOverlap)
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

	// Step 4: Persist the chunks, linking them to the new document ID.
	for i := range results {
		if err := s.store.CreateDocumentChunk(ctx, doc.ID, nil, &doc.LearningUnitID, results[i].Content, results[i].Embedding); err != nil {
			return nil, fmt.Errorf("persisting chunk %d failed: %w", i, err)
		}
	}

	return results, nil
}

// SearchSimilar embeds a query and returns top-k similar chunks from the DB.
// If documentID is provided, the results are filtered to that document.
func (s *AIService) SearchSimilar(ctx context.Context, query string, topK int, documentID *uuid.UUID, learningUnitIDs []uuid.UUID) ([]store.SimilarChunk, error) {
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

	if len(learningUnitIDs) > 0 {
		return s.store.FindSimilarChunksByLearningUnits(ctx, vectors[0], topK, learningUnitIDs)
	}
	if documentID != nil {
		return s.store.FindSimilarChunksByDocument(ctx, vectors[0], topK, *documentID)
	}
	return s.store.FindSimilarChunks(ctx, vectors[0], topK)
}

// readPDFPlainText extracts plain text from a PDF using ledongthuc/pdf.
func readPDFPlainText(data []byte) (string, error) {
	r, err := pdf.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", err
	}

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

// sanitizeString removes invalid UTF-8 sequences and null bytes from the string.
func sanitizeString(s string) string {
	// Remove invalid UTF-8 sequences
	s = strings.ToValidUTF8(s, "")
	// Remove null bytes which Postgres doesn't support in text fields
	s = strings.ReplaceAll(s, "\x00", "")
	return s
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

// AnswerQuery composes a prompt from top-K retrieved chunks and asks the LLM.
// Returns the answer text and the sources used (chunks).
func (s *AIService) AnswerQuery(ctx context.Context, query string, lens string, topK int, documentID *uuid.UUID, learningUnitIDs []uuid.UUID) (string, []store.SimilarChunk, error) {
	if s.client == nil {
		return "", nil, fmt.Errorf("genai client not initialized")
	}

	// Reuse existing retrieval to avoid re-implementing embeddings here.
	results, err := s.SearchSimilar(ctx, query, topK, documentID, learningUnitIDs)
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

	// Determine the system instruction based on the lens
	instruction, ok := AvailableLenses[lens]
	if !ok || instruction == "" {
		instruction = AvailableLenses["default"]
	}

	// Compose the LLM prompt.
	// Keep it concise and deterministic; ask the model to rely on provided context.
	prompt := fmt.Sprintf(`You are a helpful assistant.
%s

Use ONLY the CONTEXT below to answer the USER QUESTION.
If the context is insufficient, say you do not know.

CONTEXT:
%s

QUESTION:
%s

Answer:`, instruction, contextBlock, query)

	// Choose a fast model for Q&A; adjust if you prefer a different one.
	const answerModel = "gemini-3-flash-preview"

	resp, err := s.client.Models.GenerateContent(ctx, answerModel, genai.Text(prompt), nil)
	if err != nil {
		return "", results, fmt.Errorf("generate content failed: %w", err)
	}

	answer := resp.Text()
	return answer, results, nil
}
