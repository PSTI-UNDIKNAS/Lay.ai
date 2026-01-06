# API Documentation

Base URL: `http://localhost:8080/api` (or your deployed environment URL)

## 1. API Endpoints by Role

### 1.1 Public Endpoints
These endpoints are accessible to anyone without authentication.

| HTTP Method | Endpoint Path | Description | Authentication | Preconditions | Success | Errors |
|---|---|---|---|---|---|---|
| GET | `/health` | Health check | None | None | 200 | - |
| POST | `/auth/register` | Register a new user | None | Email/ID must be unique | 201 | 400, 409, 500 |
| POST | `/auth/login` | Login user | None | Valid credentials | 200 | 400, 401 |
| GET | `/courses` | List courses | None | None | 200 | 500 |
| GET | `/courses/:courseId` | Get course details | None | Course exists | 200 | 400, 404 |
| POST | `/ai/ingest` | Ingest PDF | None | None | 200 | 400, 500 |
| POST | `/ai/search` | Search similar content | None | None | 200 | 400, 500 |
| POST | `/ai/answer` | Ask AI question | None | None | 200 | 400, 500 |

### 1.2 Student Endpoints
Accessible to users with the `student` role.

| HTTP Method | Endpoint Path | Description | Authentication | Preconditions | Success | Errors |
|---|---|---|---|---|---|---|
| GET | `/auth/me` | Get current user info | Required | Valid token | 200 | 401, 500 |
| POST | `/auth/logout` | Logout user | Required | Valid token | 200 | 401 |
| POST | `/courses/:courseId/join` | Join course | Required | Course is public/open | 201 | 400, 401 |
| POST | `/courses/:courseId/request-access` | Request access to course | Required | Course is private | 201 | 400, 401 |
| DELETE | `/courses/:courseId/unenroll` | Unenroll from course | Required | User is enrolled | 200 | 400, 401 |
| POST | `/courses/:courseId/quiz/generate` | Generate quiz | Required | User enrolled in course | 200 | 400, 401, 404, 500 |
| POST | `/courses/:courseId/flashcards/generate` | Generate flashcards | Required | User enrolled in course | 200 | 400, 401, 404, 500 |
| GET | `/learning-units/courses/:courseId/units` | List learning units | Required | User enrolled in course | 200 | 400, 401, 500 |
| GET | `/learning-units/:unitId` | Get learning unit | Required | User enrolled in course | 200 | 400, 401, 404 |
| GET | `/progress/courses/:courseId/me` | Get my progress | Required | User enrolled in course | 200 | 400, 401 |
| POST | `/progress/units/:unitId/complete` | Complete unit | Required | User enrolled in course | 200 | 400, 401 |
| POST | `/progress/assignments/:assignmentId/submit` | Submit assignment | Required | User enrolled in course | 201 | 400, 401 |
| POST | `/progress/quizzes/:quizId/submit` | Submit quiz | Required | User enrolled in course | 201 | 400, 401 |
| GET | `/enrollments/me` | Get my enrollments | Required | None | 200 | 401, 500 |

### 1.3 Lecturer Endpoints
Accessible to users with the `lecturer` role.

| HTTP Method | Endpoint Path | Description | Authentication | Preconditions | Success | Errors |
|---|---|---|---|---|---|---|
| GET | `/auth/me` | Get current user info | Required | Valid token | 200 | 401, 500 |
| POST | `/auth/logout` | Logout user | Required | Valid token | 200 | 401 |
| GET | `/courses/me` | List my courses | Required | None | 200 | 401, 500 |
| POST | `/courses` | Create course | Required | None | 201 | 400, 401, 500 |
| PUT | `/courses/:courseId` | Update course | Required | User owns course | 200 | 400, 401, 404, 500 |
| DELETE | `/courses/:courseId` | Delete course | Required | User owns course | 200 | 400, 401, 404, 500 |
| GET | `/courses/:courseId/access-requests` | Get access requests | Required | User owns course | 200 | 400, 401, 500 |
| POST | `/learning-units/courses/:courseId/units` | Create learning unit | Required | User owns course | 201 | 400, 401, 500 |
| PUT | `/learning-units/:unitId` | Update learning unit | Required | User owns course | 200 | 400, 401, 404, 500 |
| DELETE | `/learning-units/:unitId` | Delete learning unit | Required | User owns course | 200 | 400, 401, 500 |
| POST | `/access-requests/:requestId/approve` | Approve access request | Required | User owns course | 200 | 400, 401 |
| POST | `/ai/upload-url` | Generate upload URL | Required | None | 200 | 400, 401, 500 |

### 1.4 Admin Endpoints
Accessible only to users with the `admin` role.

| HTTP Method | Endpoint Path | Description | Authentication | Preconditions | Success | Errors |
|---|---|---|---|---|---|---|
| GET | `/auth/me` | Get current user info | Required | Valid token | 200 | 401, 500 |
| POST | `/auth/logout` | Logout user | Required | Valid token | 200 | 401 |
| GET | `/admin/lecturers` | Get pending lecturers | Required | Status param = 'pending_approval' | 200 | 400, 500 |
| POST | `/admin/lecturers/:lecturerId/approve` | Approve lecturer | Required | User is pending lecturer | 200 | 400, 404, 500 |
| GET | `/admin/users` | Get users list | Required | None | 200 | 400, 500 |
| GET | `/admin/users/:userId` | Get user by ID | Required | User exists | 200 | 400, 404, 500 |
| POST | `/admin/users` | Create user | Required | Email unique | 201 | 400, 409, 500 |
| PUT | `/admin/users/:userId` | Update user | Required | User exists | 200 | 400, 404, 500 |
| DELETE | `/admin/users/:userId` | Delete user | Required | User exists | 200 | 400, 404, 500 |

## 2. Endpoint Details

### Authentication

#### Register User
`POST /auth/register`

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "unique_identifier": "S12345678",
  "password": "securepassword123",
  "role": "student"
}
```
*Parameters:*
- `name` (string, required): Full name
- `email` (string, required): Valid email address
- `unique_identifier` (string, required): Student ID or Lecturer ID
- `password` (string, required): Min 8 characters
- `role` (string, required): "student" or "lecturer" (Admin cannot register here)

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid-string",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student",
    "status": "active"
  }
}
```

#### Login User
`POST /auth/login`

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```
*Parameters:*
- `email` (string, required)
- `password` (string, required)

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt-token-string",
  "user": { ... }
}
```

### Courses

#### Get Courses
`GET /courses`

*Parameters:*
- `limit` (int, optional, default=10): Number of items to return
- `offset` (int, optional, default=0): Pagination offset
- `creator_id` (string, optional): Filter by creator ID

**Response:**
```json
{
  "courses": [
    {
      "id": "uuid-string",
      "title": "Introduction to AI",
      "description": "Basic AI concepts",
      "creator_id": "uuid-string",
      "access_type": "public",
      "created_at": "timestamp"
    }
  ]
}
```

#### Create Course
`POST /courses`

**Request:**
```json
{
  "title": "Advanced Physics",
  "description": "Quantum mechanics basics",
  "access_type": "private"
}
```
*Parameters:*
- `title` (string, required)
- `description` (string, optional)
- `access_type` (string, optional): "public", "private", "open"

**Response:**
```json
{
  "course": { ... }
}
```

### AI Features

#### Answer Question
`POST /ai/answer`

**Request:**
```json
{
  "query": "What is the difference between supervised and unsupervised learning?",
  "lens": "feynman",
  "top_k": 3,
  "document_id": "optional-uuid"
}
```
*Parameters:*
- `query` (string, required): The question to ask
- `lens` (string, optional): "feynman", "practitioner", "academic", "default"
- `top_k` (int, optional, default=5): Number of context chunks to retrieve
- `document_id` (string, optional): Filter context by specific document

**Response:**
```json
{
  "answer": "Generated answer...",
  "sources": [
    {
      "content": "Source text chunk...",
      "score": 0.85
    }
  ]
}
```

#### Generate Quiz
`POST /courses/:courseId/quiz/generate`

**Request:**
```json
{
  "learning_unit_ids": ["uuid-1", "uuid-2"]
}
```
*Parameters:*
- `learning_unit_ids` (array of strings, optional): Specific units to generate quiz from. If omitted, uses all course units.

**Response:**
```json
{
  "quiz": {
    "title": "Generated Quiz",
    "questions": [
      {
        "question": "What is...?",
        "options": ["A", "B", "C", "D"],
        "correct_answer": "A",
        "explanation": "Because..."
      }
    ]
  }
}
```

#### Generate Flashcards
`POST /courses/:courseId/flashcards/generate`

**Request:**
```json
{
  "learning_unit_ids": ["uuid-1", "uuid-2"]
}
```
*Parameters:*
- `learning_unit_ids` (array of strings, optional): Specific units to generate flashcards from. If omitted, uses all course units.

**Response:**
```json
{
  "flashcards": [
    {
      "front": "Term",
      "back": "Definition"
    }
  ]
}
```

## 3. Precondition Documentation

- **Course Access**:
    - For `GET /courses/:courseId` (if detailed view restricts content), user might need to be enrolled if the course is private. (Currently public view).
    - For `POST /courses/:courseId/join`, course must have `access_type` that allows joining (e.g., "public" or "open").
    - For `POST /courses/:courseId/request-access`, course must be "private".

- **Quiz/Flashcard Generation**:
    - User must be enrolled in the course.
    - Course must have learning units with ingested content (PDFs/Materials) to generate questions from.
    - If `learning_unit_ids` are provided, they must belong to the specified `courseId`.

- **Admin Actions**:
    - Only users with `role="admin"` can access `/admin` endpoints.
    - Lecturers must be in `pending_approval` status to be approved.

## 4. Optional Parameters Section

- **Pagination**:
    - `limit` (int): Defaults to 10 or 50 depending on the endpoint. Controls result set size.
    - `offset` (int): Defaults to 0. Skips N records.

- **Filtering**:
    - `creator_id` (string): Filters resources by their creator.
    - `role` (string): In admin users list, filters by user role.
    - `status` (string): In admin users list, filters by user status.

- **AI Request**:
    - `lens`: Defaults to "default" if omitted. Affects the style of the answer.
    - `top_k`: Defaults to 5.
    - `document_id`: If omitted, searches all documents in the knowledge base.

## 5. Validation Rules

- **Email**: Must be a valid email format.
- **Password**: Minimum 8 characters required.
- **UUIDs**: All ID parameters (`courseId`, `unitId`, `userId`) must be valid UUID strings.
- **Roles**: Must be one of `student`, `lecturer`, `admin`.
- **Status**: Must be one of `active`, `pending_approval`, `inactive`.
- **Files**: Uploads must typically be PDF format for ingestion.
