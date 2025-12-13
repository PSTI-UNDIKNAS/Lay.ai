include ../../.env
export

# This tells 'make' that these are command names, not files.
.PHONY: migrate-up migrate-down migrate-new seed-admin help

.DEFAULT_GOAL := help

# Compose project and default network (fallback to folder name)
PROJECT_NAME := $(if $(COMPOSE_PROJECT_NAME),$(COMPOSE_PROJECT_NAME),$(shell basename $(abspath ../..)))
DEFAULT_NETWORK := $(PROJECT_NAME)_default

## migrate-up: applies all new 'up' migrations
migrate-up:
	@echo "Running database migrations up..."
	docker run --rm --network $(DEFAULT_NETWORK) -v "$(CURDIR)/migrations:/migrations" migrate/migrate \
	-path /migrations -database "${DATABASE_URL}" \
	up

## migrate-down: reverts the very last 'up' migration
migrate-down:
	@echo "Reverting last database migration..."
	docker run --rm --network $(DEFAULT_NETWORK) -v "$(CURDIR)/migrations:/migrations" migrate/migrate \
	-path /migrations -database "${DATABASE_URL}" \
	down 1

## migrate-force: forces the database to a specific version (fix dirty state)
# Example Usage: make migrate-force version=1
migrate-force:
	@echo "Forcing database migration version to ${version}..."
	docker run --rm --network $(DEFAULT_NETWORK) -v "$(CURDIR)/migrations:/migrations" migrate/migrate \
	-path /migrations -database "${DATABASE_URL}" \
	force ${version}

## migrate-new: creates a new set of versioned migration files
# Example Usage: make migrate-new name=create_courses_table
migrate-new:
	@echo "Creating new migration files for ${name}..."
	docker run --rm -v "$(CURDIR)/migrations:/migrations" migrate/migrate create -ext sql -dir /migrations -seq ${name}

## seed-admin: creates an admin user interactively
seed-admin:
	@echo "🔐 Starting Admin User Creation Tool..."
	@echo "Connecting to Docker database on localhost:${DB_PORT}..."
	@echo "Make sure your database is running (docker-compose up -d database)"
	@echo ""
	DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${DB_PORT}/${POSTGRES_DB}?sslmode=disable" go run ./cmd/seed-admin/main.go

## help: shows available commands
help:
	@echo "-----------------------------------------------------------------------"
	@echo "Available commands:"
	@echo "-----------------------------------------------------------------------"
	@echo "Database Migrations:"
	@echo "  make migrate-up      - Apply all pending migrations"
	@echo "  make migrate-down    - Revert the last migration"
	@echo "  make migrate-new     - Create new migration files (usage: make migrate-new name=table_name)"
	@echo "-----------------------------------------------------------------------"
	@echo "Admin User Management:"
	@echo "  make seed-admin      - Create admin user interactively (Docker) [RECOMMENDED]"
	@echo "-----------------------------------------------------------------------"
	@echo "Other:"
	@echo "  make help           - Show this help message"
	@echo "-----------------------------------------------------------------------"