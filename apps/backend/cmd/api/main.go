package main

import (
	"log"
	"os"
	"path/filepath"

	"lay.ai/backend/internal/api"
	"lay.ai/backend/internal/store"

	"github.com/joho/godotenv" // You'll need this to load .env
)

func main() {
	// Try to load .env file for local development
	// In Docker, environment variables are passed directly via docker-compose
	envPath := filepath.Join("..", "..", "..", "..", ".env")
	if err := godotenv.Load(envPath); err != nil {
		log.Println("No .env file found (normal in Docker), using environment variables")
	} else {
		log.Printf("Successfully loaded .env from: %s", envPath)
	}

	// Initialize database connection
	dbStore, err := store.NewStore()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Set up routes and get the configured router back
	// The dbStore.GetDB() passes the connection pool to the routes
	router := api.SetupRoutes(dbStore.GetDB())

	// Get port from environment variable or use default
	port := os.Getenv("BACKEND_PORT")
	if port == "" {
		port = "8080"
	}

	// Start the server using the correct router
	log.Printf("Starting server on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
