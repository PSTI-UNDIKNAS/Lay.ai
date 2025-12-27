#!/usr/bin/env bash

# Run all app services locally (gateway, student-web, lecturer-web, backend)
# while using Docker only for the PostgreSQL database.
#
# Usage:
#   ./scripts/run-all.sh                 # starts DB container and all apps
#   START_DB=0 ./scripts/run-all.sh      # skips starting the DB container
#   MODE=prod ./scripts/run-all.sh       # builds all apps, then starts them (no dev compiling)
#
# Notes:
# - If backend runs locally, use localhost in DATABASE_URL
#   (e.g., postgres://user:pass@localhost:5432/dbname?sslmode=disable)
# - The Docker hostname "database" only works from inside other containers.
#   From your Mac/host, you must connect via localhost to the mapped port.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Load .env if present
if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' .env | sed 's/#.*//' | xargs)
fi

# Defaults (can be overridden via .env or environment exports)
POSTGRES_USER=${POSTGRES_USER:-layai_user}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-layai_password}
POSTGRES_DB=${POSTGRES_DB:-lay_ai_db}
DB_PORT=${DB_PORT:-5432}
BACKEND_PORT=${BACKEND_PORT:-8080}
JWT_SECRET=${JWT_SECRET:-dev-secret}
START_DB=${START_DB:-1}
MODE=${MODE:-dev}

# Start only the database via Docker (optional)
if [ "$START_DB" = "1" ]; then
  echo "Starting PostgreSQL container via docker compose (service: database)..."
  docker compose up -d database
fi

# Construct a local DATABASE_URL for the host (non-Docker) backend
if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${DB_PORT}/${POSTGRES_DB}?sslmode=disable"
fi
export JWT_SECRET

# Reduce telemetry noise in local dev (optional)
export NEXT_TELEMETRY_DISABLED=1
export TURBO_TELEMETRY_DISABLED=1

echo "Using DATABASE_URL=postgres://${POSTGRES_USER}:****@localhost:${DB_PORT}/${POSTGRES_DB}?sslmode=disable"
echo "Backend port: ${BACKEND_PORT}"
echo "Gateway: http://localhost:3000 (proxies /student, /lecturer, /admin and /api)"
echo "Student: http://localhost:3001 | Lecturer: http://localhost:3002 | Backend API: http://localhost:${BACKEND_PORT}"
echo "Mode: ${MODE}"

# Ensure dependencies are installed
if command -v bun >/dev/null 2>&1; then
  echo "Installing dependencies with Bun..."
  bun install
else
  echo "Bun not found; installing dependencies with npm..."
  npm install
fi

if [ "$MODE" = "prod" ]; then
  export NODE_ENV=production
  export NEXT_PUBLIC_API_URL=/api
  export GATEWAY_BACKEND_URL="http://127.0.0.1:${BACKEND_PORT}"
  export GATEWAY_STUDENT_URL="http://127.0.0.1:3001"
  export GATEWAY_LECTURER_URL="http://127.0.0.1:3002"
  export GATEWAY_ADMIN_URL="http://127.0.0.1:3003"

  echo "Building all apps (turbo)..."
  npm run build
fi

# Run all app services concurrently
export CONCURRENTLY_FORCE_TTY=1
if command -v bunx >/dev/null 2>&1; then
  echo "Starting apps with bunx concurrently..."
  if [ "$MODE" = "prod" ]; then
    bunx concurrently \
      "npm run start:gateway" \
      "cd apps/student-web && PORT=3001 npm start" \
      "cd apps/lecturer-web && PORT=3002 npm start" \
      "cd apps/admin-web && PORT=3003 npm start" \
      "cd apps/backend && BACKEND_PORT=${BACKEND_PORT:-8080} go run ./cmd/api/main.go"
  else
    bunx concurrently \
      "npm run dev:gateway" \
      "npm run dev:student" \
      "npm run dev:lecturer" \
      "npm run dev:backend" \
      "npm run dev:admin"
  fi
else
  echo "Starting apps with npx concurrently..."
  if [ "$MODE" = "prod" ]; then
    npx concurrently \
      "npm run start:gateway" \
      "cd apps/student-web && PORT=3001 npm start" \
      "cd apps/lecturer-web && PORT=3002 npm start" \
      "cd apps/admin-web && PORT=3003 npm start" \
      "cd apps/backend && BACKEND_PORT=${BACKEND_PORT:-8080} go run ./cmd/api/main.go"
  else
    npx concurrently \
      "npm run dev:gateway" \
      "npm run dev:student" \
      "npm run dev:lecturer" \
      "npm run dev:backend" \
      "npm run dev:admin"
  fi
fi
