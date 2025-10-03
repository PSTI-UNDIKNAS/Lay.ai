package main

import (
	"log"
	"os"

	"lay.ai/backend/internal/api"
	"lay.ai/backend/internal/store"

	"github.com/joho/godotenv" // You'll need this to load .env
)

func main() {
	// It's good practice to load .env here at the very start
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("No .env file found, using environment variables")
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
