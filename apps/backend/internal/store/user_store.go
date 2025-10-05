package store

import (
	"context"
	"fmt"
	"time"

	"lay.ai/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// UserStore handles database operations for users
type UserStore struct {
	db *pgxpool.Pool
}

// NewUserStore creates a new UserStore
func NewUserStore(db *pgxpool.Pool) *UserStore {
	return &UserStore{
		db: db,
	}
}

// CreateUser saves a new user to the database
func (s *UserStore) CreateUser(user *models.User) (*models.User, error) {
	// SQL query to insert a new user
	query := `
		INSERT INTO users (name, email, nim, password_hash, role, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at
	`

	// Set timestamps
	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now

	// Execute the INSERT query
	row := s.db.QueryRow(
		context.Background(),
		query,
		user.Name,
		user.Email,
		user.NIM,
		user.PasswordHash,
		user.Role,
		user.Status,
		user.CreatedAt,
		user.UpdatedAt,
	)

	// Scan the returned values (id, created_at, updated_at)
	err := row.Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		// Check if it's a unique constraint violation (duplicate email)
		if err.Error() == "UNIQUE constraint failed: users.email" || 
		   err.Error() == `pq: duplicate key value violates unique constraint "users_email_key"` {
			return nil, fmt.Errorf("email already exists")
		}
		return nil, fmt.Errorf("failed to insert user: %w", err)
	}

	return user, nil
}

// GetUserByEmail retrieves a user by email
func (s *UserStore) GetUserByEmail(email string) (*models.User, error) {
	query := `
		SELECT id, name, email, nim, password_hash, role, status, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	var user models.User
	row := s.db.QueryRow(context.Background(), query, email)
	
	err := row.Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.NIM,
		&user.PasswordHash,
		&user.Role,
		&user.Status,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return &user, nil
}
