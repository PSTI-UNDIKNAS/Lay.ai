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
		INSERT INTO users (name, email, unique_identifier, password_hash, role, status, created_at, updated_at)
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
		user.UniqueIdentifier,
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
		SELECT id, name, email, unique_identifier, password_hash, role, status, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	var user models.User
	row := s.db.QueryRow(context.Background(), query, email)
	
	err := row.Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.UniqueIdentifier,
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

// GetPendingLecturers retrieves all lecturers with pending approval status
func (s *UserStore) GetPendingLecturers() ([]*models.User, error) {
	query := `
		SELECT id, name, email, unique_identifier, password_hash, role, status, created_at, updated_at
		FROM users
		WHERE role = $1 AND status = $2
		ORDER BY created_at ASC
	`

	rows, err := s.db.Query(context.Background(), query, models.RoleLecturer, models.StatusPendingApproval)
	if err != nil {
		return nil, fmt.Errorf("failed to query pending lecturers: %w", err)
	}
	defer rows.Close()

	var lecturers []*models.User
	for rows.Next() {
		var user models.User
		err := rows.Scan(
			&user.ID,
			&user.Name,
			&user.Email,
			&user.UniqueIdentifier,
			&user.PasswordHash,
			&user.Role,
			&user.Status,
			&user.CreatedAt,
			&user.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan lecturer: %w", err)
		}
		lecturers = append(lecturers, &user)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating over lecturer rows: %w", err)
	}

	return lecturers, nil
}

// UpdateUserStatus updates a user's status
func (s *UserStore) UpdateUserStatus(userID string, status models.UserStatus) error {
	query := `
		UPDATE users 
		SET status = $1, updated_at = $2
		WHERE id = $3
	`

	now := time.Now()
	result, err := s.db.Exec(context.Background(), query, status, now, userID)
	if err != nil {
		return fmt.Errorf("failed to update user status: %w", err)
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

// GetUserByID retrieves a user by ID
func (s *UserStore) GetUserByID(userID string) (*models.User, error) {
	query := `
		SELECT id, name, email, unique_identifier, password_hash, role, status, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var user models.User
	row := s.db.QueryRow(context.Background(), query, userID)
	
	err := row.Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.UniqueIdentifier,
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

// GetUsers retrieves all users with optional filtering
func (s *UserStore) GetUsers(role *models.UserRole, status *models.UserStatus, limit, offset int) ([]*models.User, error) {
	query := `
		SELECT id, name, email, unique_identifier, password_hash, role, status, created_at, updated_at
		FROM users
		WHERE 1=1
	`
	
	args := []interface{}{}
	argIndex := 1

	// Add role filter if provided
	if role != nil {
		query += fmt.Sprintf(" AND role = $%d", argIndex)
		args = append(args, *role)
		argIndex++
	}

	// Add status filter if provided
	if status != nil {
		query += fmt.Sprintf(" AND status = $%d", argIndex)
		args = append(args, *status)
		argIndex++
	}

	// Add ordering and pagination
	query += " ORDER BY created_at DESC"
	
	if limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, limit)
		argIndex++
	}
	
	if offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, offset)
	}

	rows, err := s.db.Query(context.Background(), query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query users: %w", err)
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		var user models.User
		err := rows.Scan(
			&user.ID,
			&user.Name,
			&user.Email,
			&user.UniqueIdentifier,
			&user.PasswordHash,
			&user.Role,
			&user.Status,
			&user.CreatedAt,
			&user.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, &user)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating over user rows: %w", err)
	}

	return users, nil
}

// UpdateUser updates a user's information
func (s *UserStore) UpdateUser(userID string, updates map[string]interface{}) (*models.User, error) {
	if len(updates) == 0 {
		return nil, fmt.Errorf("no updates provided")
	}

	// Build dynamic update query
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	for field, value := range updates {
		setParts = append(setParts, fmt.Sprintf("%s = $%d", field, argIndex))
		args = append(args, value)
		argIndex++
	}

	// Always update the updated_at timestamp
	setParts = append(setParts, fmt.Sprintf("updated_at = $%d", argIndex))
	args = append(args, time.Now())
	argIndex++

	// Add WHERE clause
	args = append(args, userID)

	// Build the SET clause
	setClause := ""
	for i, part := range setParts {
		if i > 0 {
			setClause += ", "
		}
		setClause += part
	}

	query := fmt.Sprintf(`
		UPDATE users 
		SET %s
		WHERE id = $%d
		RETURNING id, name, email, unique_identifier, password_hash, role, status, created_at, updated_at
	`, setClause, argIndex)

	var user models.User
	row := s.db.QueryRow(context.Background(), query, args...)
	
	err := row.Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.UniqueIdentifier,
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
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	return &user, nil
}

// DeleteUser soft deletes a user by setting status to inactive
func (s *UserStore) DeleteUser(userID string) error {
	query := `
		UPDATE users 
		SET status = $1, updated_at = $2
		WHERE id = $3
	`

	now := time.Now()
	result, err := s.db.Exec(context.Background(), query, models.StatusInactive, now, userID)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}
