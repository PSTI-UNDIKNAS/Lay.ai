package api

import (
	"lay.ai/backend/internal/handlers"
	"lay.ai/backend/internal/middleware"
	"lay.ai/backend/internal/services"
	"lay.ai/backend/internal/store"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SetupRoutes configures all the API routes and returns a Gin router.
// Matches cmd/api/main.go signature.
func SetupRoutes(db *pgxpool.Pool) *gin.Engine {
	// Create the Gin router
	router := gin.Default()

	// Set up middleware
	SetupMiddleware(router)

	// Initialize stores
	userStore := store.NewUserStore(db)
	courseStore := store.NewCourseStore(db)
	learningUnitStore := store.NewLearningUnitStore(db)
	assignmentStore := store.NewAssignmentStore(db)
	quizStore := store.NewQuizStore(db)
	submissionStore := store.NewSubmissionStore(db)
	enrollmentStore := store.NewEnrollmentStore(db)
	aiStore := store.NewAIStore(db)
	generatedContentStore := store.NewGeneratedContentStore(db)
	documentStore := store.NewDocumentStore(db)

	// Initialize services
	authService := services.NewAuthService(userStore)
	adminService := services.NewAdminService(userStore)
	courseService := services.NewCourseService(courseStore)
	learningUnitService := services.NewLearningUnitService(learningUnitStore)
	assignmentService := services.NewAssignmentService(assignmentStore)
	quizService := services.NewQuizService(quizStore)
	submissionService := services.NewSubmissionService(submissionStore)
	enrollmentService := services.NewEnrollmentService(enrollmentStore, courseStore)
	documentService := services.NewDocumentService(documentStore)
	aiService := services.NewAIService(aiStore, generatedContentStore, documentService)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	adminHandler := handlers.NewAdminHandler(
		adminService,
		courseService,
		learningUnitService,
		assignmentService,
		quizService,
		submissionService,
	)
	courseHandler := handlers.NewCourseHandler(courseService)
	learningUnitHandler := handlers.NewLearningUnitHandler(learningUnitService, courseService)
	progressHandler := handlers.NewProgressHandler(
		courseService,
		learningUnitService,
		assignmentService,
		quizService,
		submissionService,
	)
	enrollmentHandler := handlers.NewEnrollmentHandler(enrollmentService)
	aiHandler := handlers.NewAIHandler(aiService)
	quizHandler := handlers.NewQuizHandler(aiService, learningUnitService, courseService)

	// API routes
	v1 := router.Group("/api")
	{
		// Health check endpoint
		v1.GET("/health", HealthHandler)

		// Authentication routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.RegisterUserHandler)
			auth.POST("/login", authHandler.LoginUserHandler)
			auth.GET("/me", middleware.AuthWithStatusMiddleware(authService), authHandler.GetMeHandler)
			auth.POST("/logout", middleware.AuthWithStatusMiddleware(authService), authHandler.LogoutHandler)
		}

		// Admin routes (Admin Only)
		admin := v1.Group("/admin")
		admin.Use(middleware.AuthWithStatusMiddleware(authService))
		admin.Use(middleware.AdminOnlyMiddleware(authService))
		{
			admin.GET("/lecturers", adminHandler.GetPendingLecturers)
			admin.POST("/lecturers/:lecturerId/approve", adminHandler.ApproveLecturer)

			admin.GET("/users", adminHandler.GetUsers)
			admin.GET("/users/:userId", adminHandler.GetUserByID)
			admin.POST("/users", adminHandler.CreateUser)
			admin.PUT("/users/:userId", adminHandler.UpdateUser)
			admin.DELETE("/users/:userId", adminHandler.DeleteUser)

			admin.GET("/courses", adminHandler.GetCourses)
			admin.GET("/courses/:courseId", adminHandler.GetCourseByID)
			admin.PUT("/courses/:courseId", adminHandler.UpdateCourse)
			admin.DELETE("/courses/:courseId", adminHandler.DeleteCourse)

			admin.GET("/learning-units", adminHandler.GetLearningUnits)
			admin.GET("/learning-units/:unitId", adminHandler.GetLearningUnitByID)
			admin.PUT("/learning-units/:unitId", adminHandler.UpdateLearningUnit)
			admin.DELETE("/learning-units/:unitId", adminHandler.DeleteLearningUnit)

			admin.GET("/assignments", adminHandler.GetAssignments)
			admin.GET("/assignments/:assignmentId", adminHandler.GetAssignmentByID)
			admin.PUT("/assignments/:assignmentId", adminHandler.UpdateAssignment)
			admin.DELETE("/assignments/:assignmentId", adminHandler.DeleteAssignment)

			admin.GET("/quizzes", adminHandler.GetQuizzes)
			admin.GET("/quizzes/:quizId", adminHandler.GetQuizByID)
			admin.PUT("/quizzes/:quizId", adminHandler.UpdateQuiz)
			admin.DELETE("/quizzes/:quizId", adminHandler.DeleteQuiz)

			admin.GET("/submissions", adminHandler.GetSubmissions)
			admin.GET("/submissions/:submissionId", adminHandler.GetSubmissionByID)
			admin.PUT("/submissions/:submissionId", adminHandler.UpdateSubmission)
			admin.DELETE("/submissions/:submissionId", adminHandler.DeleteSubmission)
		}

		// Course routes
		courses := v1.Group("/courses")
		{
			courses.GET("", courseHandler.GetCourses)
			courses.GET("/:courseId", courseHandler.GetCourseByID)
			courses.POST("/:courseId/quiz/generate", middleware.AuthWithStatusMiddleware(authService), middleware.EnrollmentRequiredMiddleware(enrollmentStore), quizHandler.GenerateQuiz)
			courses.POST("/:courseId/flashcards/generate", middleware.AuthWithStatusMiddleware(authService), middleware.EnrollmentRequiredMiddleware(enrollmentStore), quizHandler.GenerateFlashcards)

			courses.GET("/me", middleware.AuthWithStatusMiddleware(authService), middleware.LecturerOnlyMiddleware(authService), courseHandler.GetMyCourses)
			courses.POST("", middleware.AuthWithStatusMiddleware(authService), middleware.LecturerOnlyMiddleware(authService), courseHandler.CreateCourse)
			courses.PUT("/:courseId", middleware.AuthWithStatusMiddleware(authService), middleware.LecturerOnlyMiddleware(authService), middleware.CourseOwnershipMiddleware(courseService), courseHandler.UpdateCourse)
			courses.DELETE("/:courseId", middleware.AuthWithStatusMiddleware(authService), middleware.LecturerOnlyMiddleware(authService), middleware.CourseOwnershipMiddleware(courseService), courseHandler.DeleteCourse)

			courses.POST("/:courseId/join", middleware.AuthWithStatusMiddleware(authService), middleware.StudentOnlyMiddleware(authService), enrollmentHandler.JoinCourse)
			courses.POST("/:courseId/request-access", middleware.AuthWithStatusMiddleware(authService), middleware.StudentOnlyMiddleware(authService), enrollmentHandler.RequestAccess)
			courses.GET("/:courseId/access-requests", middleware.AuthWithStatusMiddleware(authService), middleware.LecturerOnlyMiddleware(authService), middleware.CourseOwnershipMiddleware(courseService), enrollmentHandler.GetAccessRequests)
			courses.DELETE("/:courseId/unenroll", middleware.AuthWithStatusMiddleware(authService), middleware.StudentOnlyMiddleware(authService), enrollmentHandler.UnenrollFromCourse)
		}

		// Learning unit routes
		learningUnits := v1.Group("/learning-units")
		learningUnits.Use(middleware.AuthWithStatusMiddleware(authService))
		{
			learningUnits.GET("/courses/:courseId/units/manage", middleware.LecturerOnlyMiddleware(authService), middleware.CourseOwnershipMiddleware(courseService), learningUnitHandler.GetLearningUnits)
			learningUnits.POST("/courses/:courseId/units", middleware.LecturerOnlyMiddleware(authService), middleware.CourseOwnershipMiddleware(courseService), learningUnitHandler.CreateLearningUnit)
			learningUnits.PUT("/:unitId", middleware.LecturerOnlyMiddleware(authService), learningUnitHandler.UpdateLearningUnit)
			learningUnits.DELETE("/:unitId", middleware.LecturerOnlyMiddleware(authService), learningUnitHandler.DeleteLearningUnit)

			learningUnits.GET("/courses/:courseId/units", middleware.StudentOnlyMiddleware(authService), middleware.EnrollmentRequiredMiddleware(enrollmentStore), learningUnitHandler.GetLearningUnits)
			learningUnits.GET("/:unitId", middleware.StudentOnlyMiddleware(authService), learningUnitHandler.GetLearningUnitByID)
		}

		// Progress routes
		progress := v1.Group("/progress")
		progress.Use(middleware.AuthWithStatusMiddleware(authService))
		progress.Use(middleware.StudentOnlyMiddleware(authService))
		{
			progress.GET("/courses/:courseId/me", middleware.EnrollmentRequiredMiddleware(enrollmentStore), progressHandler.GetStudentProgress)
			progress.POST("/units/:unitId/complete", progressHandler.CompleteUnit)
			progress.POST("/assignments/:assignmentId/submit", progressHandler.SubmitAssignment)
			progress.POST("/quizzes/:quizId/submit", progressHandler.SubmitQuiz)
		}

		// Enrollment routes
		enrollments := v1.Group("/enrollments")
		enrollments.Use(middleware.AuthWithStatusMiddleware(authService))
		{
			enrollments.GET("/me", middleware.StudentOnlyMiddleware(authService), enrollmentHandler.GetMyEnrollments)
		}

		// Access request routes
		accessRequests := v1.Group("/access-requests")
		accessRequests.Use(middleware.AuthWithStatusMiddleware(authService))
		accessRequests.Use(middleware.LecturerOnlyMiddleware(authService))
		{
			accessRequests.POST("/:requestId/approve", enrollmentHandler.ApproveAccessRequest)
		}

		// AI routes
		ai := v1.Group("/ai")
		{
			ai.POST("/upload-url", middleware.AuthWithStatusMiddleware(authService), middleware.LecturerOnlyMiddleware(authService), aiHandler.GenerateUploadURLHandler)
			ai.POST("/ingest", aiHandler.IngestPDFHandler)
			ai.POST("/search", aiHandler.SearchSimilarHandler)
			ai.POST("/answer", aiHandler.AnswerHandler)
		}
	}

	return router
}

// SetupMiddleware configures middleware for the router
func SetupMiddleware(router *gin.Engine) {
	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Logging middleware (Gin's default logger)
	router.Use(gin.Logger())

	// Recovery middleware
	router.Use(gin.Recovery())
}

// HealthHandler handles the health check endpoint
func HealthHandler(c *gin.Context) {
	c.JSON(200, gin.H{
		"status":  "healthy",
		"message": "lay.ai backend is running",
	})
}
