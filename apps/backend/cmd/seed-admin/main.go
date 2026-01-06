package main

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Get database connection string from environment
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	// Connect to database
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer conn.Close(ctx)

	// Test connection
	if err := conn.Ping(ctx); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	fmt.Println("🔐 Admin User Creation Tool")
	fmt.Println("==========================")

	// Get admin details
	reader := bufio.NewReader(os.Stdin)

	fmt.Print("Enter admin name: ")
	name, _ := reader.ReadString('\n')
	name = strings.TrimSpace(name)
	if name == "" {
		log.Fatal("Name is required")
	}

	fmt.Print("Enter admin email: ")
	email, _ := reader.ReadString('\n')
	email = strings.TrimSpace(email)
	if email == "" {
		log.Fatal("Email is required")
	}

	fmt.Print("Enter unique identifier (e.g., ADMIN001): ")
	uniqueID, _ := reader.ReadString('\n')
	uniqueID = strings.TrimSpace(uniqueID)
	if uniqueID == "" {
		log.Fatal("Unique identifier is required")
	}

	// Get password (Note: This will be visible in terminal for simplicity)
	fmt.Print("Enter admin password (min 8 characters): ")
	password, _ := reader.ReadString('\n')
	password = strings.TrimSpace(password)

	if len(password) < 8 {
		log.Fatal("Password must be at least 8 characters long")
	}

	// Confirm password
	fmt.Print("Confirm admin password: ")
	confirmPassword, _ := reader.ReadString('\n')
	confirmPassword = strings.TrimSpace(confirmPassword)

	if password != confirmPassword {
		log.Fatal("Passwords do not match")
	}

	// Check if user already exists
	var existingID string
	err = conn.QueryRow(ctx, "SELECT id FROM users WHERE email = $1 OR unique_identifier = $2", email, uniqueID).Scan(&existingID)
	if err == nil {
		log.Fatal("User with this email or unique identifier already exists")
	} else if err != pgx.ErrNoRows {
		log.Fatalf("Failed to check existing user: %v", err)
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	// Generate UUID
	userID := uuid.New()

	// Insert admin user
	query := `
		INSERT INTO users (id, name, email, unique_identifier, password_hash, role, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, 'admin', 'active', NOW(), NOW())
	`

	_, err = conn.Exec(ctx, query, userID, name, email, uniqueID, string(hashedPassword))
	if err != nil {
		log.Fatalf("Failed to create admin user: %v", err)
	}

	fmt.Printf("✅ Admin user created successfully!\n")
	fmt.Printf("   ID: %s\n", userID)
	fmt.Printf("   Name: %s\n", name)
	fmt.Printf("   Email: %s\n", email)
	fmt.Printf("   Unique ID: %s\n", uniqueID)
	fmt.Printf("   Role: admin\n")
	fmt.Printf("   Status: active\n")
	fmt.Println("\n🔒 Please store these credentials securely!")
	fmt.Println("\n⚠️  Note: Password was entered in plain text. Use this tool in a secure environment.")
}