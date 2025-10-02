package store

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Store defines all the database access methods for your application.
// It holds the connection pool.
type Store struct {
	db *pgxpool.Pool
}

// NewStore creates a new Store with a database connection pool.
func NewStore() (*Store, error) {
	// Get the database connection string from environment variables
	connString := os.Getenv("DATABASE_URL")
	if connString == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is not set")
	}

	// Create a new connection pool
	dbpool, err := pgxpool.New(context.Background(), connString)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	// Ping the database to ensure the connection is alive
	if err := dbpool.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}

	return &Store{db: dbpool}, nil
}
