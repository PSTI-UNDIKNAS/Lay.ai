package api

import (
	"lay.ai/backend/internal/handlers"
	"lay.ai/backend/internal/services"
	"lay.ai/backend/internal/store"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SetupRoutes configures all the API routes
func SetupRoutes(db *pgxpool.Pool) *gin.Engine {
	// Create the Gin router
	router := gin.Default()

	// Set up middleware
	SetupMiddleware(router)

	// Initialize stores
	userStore := store.NewUserStore(db)

	// Initialize services
	authService := services.NewAuthService(userStore)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)

	// API v1 routes
	v1 := router.Group("/api")
	{
		// Health check endpoint
		v1.GET("/health", HealthHandler)

		// Authentication routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.RegisterUserHandler)
			// Future auth endpoints can be added here:
			// auth.POST("/login", authHandler.LoginHandler)
			// auth.POST("/logout", authHandler.LogoutHandler)
		}

		// Future route groups can be added here:
		// users := v1.Group("/users")
		// courses := v1.Group("/courses")
		// assignments := v1.Group("/assignments")
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
