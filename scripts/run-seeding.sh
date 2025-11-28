#!/usr/bin/env bash

# lay.ai end-to-end seeding script
# - Uses curl and jq to hit backend API sequentially
# - Fails fast on any non-2xx or network error
# - Prints clear, colored status messages

set -euo pipefail

# ==== Config ====
BASE_URL="${BASE_URL:-http://localhost:8080/api}"

# Default credentials for pre-seeded admin (see testscenarios.md)
ADMIN_EMAIL="${ADMIN_EMAIL:-dewa@gmail.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Dewakd123}"

# Generate a unique suffix for this run to avoid email conflicts
RUN_ID="$(date +%s)"

# Lecturer seed data
LECTURER_NAME="Dr. Jane Lecturer"
LECTURER_EMAIL="lecturer_${RUN_ID}@layai.com"
LECTURER_UNIQUE="LEC_${RUN_ID}"
LECTURER_PASSWORD="password123"

# Student seed data
STUDENT_NAME="John Student"
STUDENT_EMAIL="student_${RUN_ID}@layai.com"
STUDENT_UNIQUE="STU_${RUN_ID}"
STUDENT_PASSWORD="password123"

# Course and content seed data
COURSE_TITLE="Intro to LayAI"
COURSE_DESC="Getting started with LayAI platform"
COURSE_ACCESS="public"

UNIT1_TITLE="Unit 1: Foundations"
UNIT1_DESC="Core concepts and setup"
UNIT1_ORDER=1

UNIT2_TITLE="Unit 2: Hands-on"
UNIT2_DESC="Practical walkthroughs"
UNIT2_ORDER=2

# ==== Colors ====
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m"

log_info() { printf "${BLUE}%s${NC}\n" "$1"; }
log_ok()   { printf "${GREEN}%s${NC}\n" "$1"; }
log_warn() { printf "${YELLOW}%s${NC}\n" "$1"; }
log_err()  { printf "${RED}%s${NC}\n" "$1"; }

# Trap unexpected errors
trap 'log_err "Script encountered an error. Aborting."' ERR

# Ensure required tools exist
require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { log_err "Required command '$1' is not installed"; exit 1; }
}
require_cmd curl
require_cmd jq

# Helper: make JSON request with curl; exit on non-2xx or network failure
# Usage: make_request METHOD ENDPOINT TOKEN DATA_JSON
# - METHOD: GET|POST|PUT|DELETE
# - ENDPOINT: path starting with '/'
# - TOKEN: optional JWT (pass empty string if none)
# - DATA_JSON: optional JSON string for -d (pass empty string if none)
# Returns: response body on stdout; sets LAST_HTTP_CODE
LAST_HTTP_CODE=""
make_request() {
  local method="$1"; shift
  local endpoint="$1"; shift
  local token="${1:-}"; shift || true
  local data="${1:-}"; shift || true

  local url="${BASE_URL}${endpoint}"
  local tmp_body
  tmp_body="$(mktemp)"

  local -a args
  args=(
    -sS -o "$tmp_body" -w "%{http_code}"
    -X "$method" "$url"
    -H "Content-Type: application/json"
  )
  if [[ -n "$token" ]]; then
    args+=( -H "Authorization: Bearer ${token}" )
  fi
  if [[ -n "$data" ]]; then
    args+=( -d "$data" )
  fi

  # Run curl safely even with set -e
  set +e
  local http_code
  http_code=$(curl "${args[@]}")
  local curl_exit=$?
  set -e

  LAST_HTTP_CODE="$http_code"
  if (( curl_exit != 0 )); then
    log_err "Network/connection error calling ${method} ${endpoint}"
    [[ -f "$tmp_body" ]] && {
      printf "Response body (if any):\n"; sed -e 's/^/  /' "$tmp_body" || true
    }
    rm -f "$tmp_body"
    exit 1
  fi

  if [[ ! "$http_code" =~ ^2 ]]; then
    log_err "HTTP ${http_code} from ${method} ${endpoint}"
    printf "Response body:\n"; sed -e 's/^/  /' "$tmp_body"
    rm -f "$tmp_body"
    exit 1
  fi

  cat "$tmp_body"
  rm -f "$tmp_body"
}

# ==== Flow ====
log_info "Base URL: ${BASE_URL}"

# Step 1: Admin login (pre-seeded admin)
log_info "[1/6] Admin login..."
ADMIN_LOGIN=$(make_request POST \
  "/auth/login" \
  "" \
  "$(jq -nc --arg e "$ADMIN_EMAIL" --arg p "$ADMIN_PASSWORD" '{email:$e,password:$p}')"
)
ADMIN_TOKEN=$(jq -r '.token' <<<"$ADMIN_LOGIN")
ADMIN_ID=$(jq -r '.user.id' <<<"$ADMIN_LOGIN")
if [[ -z "$ADMIN_TOKEN" || "$ADMIN_TOKEN" == "null" ]]; then
  log_err "Failed to obtain ADMIN_TOKEN. Ensure admin user exists and credentials are correct."
  exit 1
fi
log_ok "Admin authenticated (id: ${ADMIN_ID})."

# Step 2: Lecturer setup (register → admin approve → login)
log_info "[2/6] Register lecturer..."
LECTURER_REG=$(make_request POST \
  "/auth/register" \
  "" \
  "$(jq -nc \
      --arg n "$LECTURER_NAME" \
      --arg e "$LECTURER_EMAIL" \
      --arg u "$LECTURER_UNIQUE" \
      --arg p "$LECTURER_PASSWORD" \
      --arg r "lecturer" \
      '{name:$n,email:$e,unique_identifier:$u,password:$p,role:$r}')"
)
LECTURER_ID=$(jq -r '.user.id' <<<"$LECTURER_REG")
log_ok "Lecturer registered (id: ${LECTURER_ID})."

log_info "Approve lecturer via admin..."
APPROVE_RES=$(make_request POST "/admin/lecturers/${LECTURER_ID}/approve" "$ADMIN_TOKEN" "")
APPROVED_OK=$(jq -r '.success' <<<"$APPROVE_RES")
if [[ "$APPROVED_OK" != "true" ]]; then
  log_err "Lecturer approval failed."
  exit 1
fi
log_ok "Lecturer approved."

log_info "Login lecturer..."
LECTURER_LOGIN=$(make_request POST \
  "/auth/login" \
  "" \
  "$(jq -nc --arg e "$LECTURER_EMAIL" --arg p "$LECTURER_PASSWORD" '{email:$e,password:$p}')"
)
LECTURER_TOKEN=$(jq -r '.token' <<<"$LECTURER_LOGIN")
if [[ -z "$LECTURER_TOKEN" || "$LECTURER_TOKEN" == "null" ]]; then
  log_err "Failed to obtain LECTURER_TOKEN."
  exit 1
fi
log_ok "Lecturer authenticated."

# Step 3: Student setup (register → login)
log_info "[3/6] Register student..."
STUDENT_REG=$(make_request POST \
  "/auth/register" \
  "" \
  "$(jq -nc \
      --arg n "$STUDENT_NAME" \
      --arg e "$STUDENT_EMAIL" \
      --arg u "$STUDENT_UNIQUE" \
      --arg p "$STUDENT_PASSWORD" \
      --arg r "student" \
      '{name:$n,email:$e,unique_identifier:$u,password:$p,role:$r}')"
)
STUDENT_ID=$(jq -r '.user.id' <<<"$STUDENT_REG")
log_ok "Student registered (id: ${STUDENT_ID})."

log_info "Login student..."
STUDENT_LOGIN=$(make_request POST \
  "/auth/login" \
  "" \
  "$(jq -nc --arg e "$STUDENT_EMAIL" --arg p "$STUDENT_PASSWORD" '{email:$e,password:$p}')"
)
STUDENT_TOKEN=$(jq -r '.token' <<<"$STUDENT_LOGIN")
if [[ -z "$STUDENT_TOKEN" || "$STUDENT_TOKEN" == "null" ]]; then
  log_err "Failed to obtain STUDENT_TOKEN."
  exit 1
fi
log_ok "Student authenticated."

# Step 4: Course creation by lecturer
log_info "[4/6] Create course..."
COURSE_CREATE=$(make_request POST \
  "/courses/" \
  "$LECTURER_TOKEN" \
  "$(jq -nc --arg t "$COURSE_TITLE" --arg d "$COURSE_DESC" --arg a "$COURSE_ACCESS" '{title:$t,description:$d,access_type:$a}')"
)
COURSE_ID=$(jq -r '.course.id' <<<"$COURSE_CREATE")
if [[ -z "$COURSE_ID" || "$COURSE_ID" == "null" ]]; then
  log_err "Course creation did not return an id."
  exit 1
fi
log_ok "Course created (id: ${COURSE_ID})."

# Step 5: Content creation (two learning units)
log_info "[5/6] Create learning unit 1..."
UNIT1_CREATE=$(make_request POST \
  "/learning-units/courses/${COURSE_ID}/units" \
  "$LECTURER_TOKEN" \
  "$(jq -nc --arg t "$UNIT1_TITLE" --arg d "$UNIT1_DESC" --argjson o $UNIT1_ORDER '{title:$t,description:$d,order_index:$o}')"
)
UNIT1_ID=$(jq -r '.unit.id' <<<"$UNIT1_CREATE")
log_ok "Learning Unit 1 created (id: ${UNIT1_ID})."

log_info "Create learning unit 2..."
UNIT2_CREATE=$(make_request POST \
  "/learning-units/courses/${COURSE_ID}/units" \
  "$LECTURER_TOKEN" \
  "$(jq -nc --arg t "$UNIT2_TITLE" --arg d "$UNIT2_DESC" --argjson o $UNIT2_ORDER '{title:$t,description:$d,order_index:$o}')"
)
UNIT2_ID=$(jq -r '.unit.id' <<<"$UNIT2_CREATE")
log_ok "Learning Unit 2 created (id: ${UNIT2_ID})."

# Create document record for Unit 1 (no chunking)
# Load .env if available and safely handle unset vars under 'set -u'
if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -f ".env" ]]; then
    set -a
    source ".env"
    set +a
  fi
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  log_err "DATABASE_URL is not set. Export it or add to .env"
  exit 1
fi

# Resolve repo root and use document.pdf there
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PDF_PATH="$REPO_ROOT/document.pdf"

if [[ ! -f "$PDF_PATH" ]]; then
  log_err "document.pdf not found at repo root: $PDF_PATH"
  exit 1
fi

# Insert the document using psql inside the 'database' container
DOC_ID=$(docker compose -f "$REPO_ROOT/docker-compose.yml" exec -T database sh -lc \
  "PGPASSWORD=\"\$POSTGRES_PASSWORD\" psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -At -c \
   \"INSERT INTO documents (learning_unit_id, file_name, storage_path)
      VALUES ('${UNIT1_ID}', 'document.pdf', 'document.pdf')
      RETURNING id;\"" \
  | tr -d '[:space:]')

if [[ -z "${DOC_ID:-}" ]]; then
  log_err "Failed to create document record."
  exit 1
fi
log_ok "Document record created (id: ${DOC_ID})."

# ==== Summary ====
echo
log_info "Seeding completed successfully. Summary:"
printf -- "- Admin ID: %s\n" "$ADMIN_ID"
printf -- "- Lecturer: %s (%s) id=%s\n" "$LECTURER_NAME" "$LECTURER_EMAIL" "$LECTURER_ID"
printf -- "- Student: %s (%s) id=%s\n" "$STUDENT_NAME" "$STUDENT_EMAIL" "$STUDENT_ID"
printf -- "- Course: %s id=%s\n" "$COURSE_TITLE" "$COURSE_ID"
printf -- "- Units: [%s, %s]\n" "$UNIT1_ID" "$UNIT2_ID"
printf -- "- Enrollment id: %s\n" "${ENROLL_ID:-N/A}"
printf -- "- Document id: %s\n" "${DOC_ID:-N/A}"

log_warn "Progress endpoints (submit/complete) currently return placeholders and may not persist to DB."

log_ok "Done."