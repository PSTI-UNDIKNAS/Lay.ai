# 🧪 Test Scenarios for Learning Management System

This document contains comprehensive test scenarios with all endpoints and JSON payloads needed for testing the LMS system.

## 📋 Test Environment Setup

### Prerequisites
- Backend server running on `http://localhost:8080`
- Database migrated and clean
- Admin account pre-created

### Base URL
```
BASE_URL = http://localhost:8080/api
```

---

## 🎓 STUDENT TEST SCENARIOS

### Scenario 1: Student Registration & Authentication

#### 1.1 Register Student
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Student",
  "email": "john.student@example.com",
  "unique_identifier": "STU001",
  "password": "password123",
  "role": "student"
}
```
**Expected Response:** `201 Created`
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "name": "John Student",
    "email": "john.student@example.com",
    "role": "student",
    "status": "active"
  }
}
```

#### 1.2 Student Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john.student@example.com",
  "password": "password123"
}
```
**Expected Response:** `200 OK`
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "name": "John Student",
    "email": "john.student@example.com",
    "role": "student"
  }
}
```

#### 1.3 Get Student Profile
```http
GET /api/auth/me
Authorization: Bearer {student_token}
```
**Expected Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "John Student",
  "email": "john.student@example.com",
  "role": "student",
  "status": "active"
}
```

### Scenario 2: Course Discovery & Enrollment

#### 2.1 View Available Courses
```http
GET /api/courses
```
**Expected Response:** `200 OK`
```json
{
  "courses": [
    {
      "id": "course_uuid",
      "title": "Introduction to Programming",
      "description": "Learn programming basics",
      "access_type": "public",
      "creator_id": "lecturer_uuid",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 2.2 Get Course Details
```http
GET /api/courses/{courseId}
```
**Expected Response:** `200 OK`
```json
{
  "id": "course_uuid",
  "title": "Introduction to Programming",
  "description": "Learn programming basics",
  "access_type": "public",
  "creator_id": "lecturer_uuid",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### 2.3 Join Public Course
```http
POST /api/courses/{courseId}/join
Authorization: Bearer {student_token}
Content-Type: application/json

{}
```
**Expected Response:** `200 OK`
```json
{
  "message": "Successfully joined course",
  "enrollment": {
    "id": "enrollment_uuid",
    "student_id": "student_uuid",
    "course_id": "course_uuid",
    "status": "enrolled",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 2.4 Join Password-Protected Course
```http
POST /api/courses/{passwordCourseId}/join
Authorization: Bearer {student_token}
Content-Type: application/json

{
  "password": "course123"
}
```
**Expected Response:** `200 OK`

#### 2.5 Join Password Course (Wrong Password)
```http
POST /api/courses/{passwordCourseId}/join
Authorization: Bearer {student_token}
Content-Type: application/json

{
  "password": "wrongpassword"
}
```
**Expected Response:** `400 Bad Request`
```json
{
  "error": "invalid password"
}
```

#### 2.6 Request Access to Restricted Course
```http
POST /api/courses/{restrictedCourseId}/request-access
Authorization: Bearer {student_token}
Content-Type: application/json

{}
```
**Expected Response:** `200 OK`
```json
{
  "message": "Access request submitted successfully",
  "enrollment": {
    "id": "enrollment_uuid",
    "student_id": "student_uuid",
    "course_id": "course_uuid",
    "status": "pending_approval",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Scenario 3: Student Enrollment Management

#### 3.1 View My Enrollments
```http
GET /api/enrollments/me
Authorization: Bearer {student_token}
```
**Expected Response:** `200 OK`
```json
{
  "enrollments": [
    {
      "id": "enrollment_uuid",
      "student_id": "student_uuid",
      "course_id": "course_uuid",
      "status": "enrolled",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 3.2 Unenroll from Course
```http
DELETE /api/enrollments/{enrollmentId}
Authorization: Bearer {student_token}
```
**Expected Response:** `200 OK`
```json
{
  "message": "Successfully unenrolled from course"
}
```

### Scenario 4: Learning Content Access

#### 4.1 Access Course Learning Units (Enrolled)
```http
GET /api/courses/{courseId}/units
Authorization: Bearer {student_token}
```
**Expected Response:** `200 OK`
```json
{
  "units": [
    {
      "id": "unit_uuid",
      "course_id": "course_uuid",
      "title": "Chapter 1: Variables",
      "description": "Introduction to variables",
      "unit_order": 1,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 4.2 Access Course Content (Not Enrolled)
```http
GET /api/courses/{notEnrolledCourseId}/units
Authorization: Bearer {student_token}
```
**Expected Response:** `403 Forbidden`
```json
{
  "error": "enrollment required"
}
```

### Scenario 5: Progress Tracking

#### 5.1 View Course Progress
```http
GET /api/courses/{courseId}/me
Authorization: Bearer {student_token}
```
**Expected Response:** `200 OK`
```json
{
  "course_id": "course_uuid",
  "student_id": "student_uuid",
  "progress": [
    {
      "learning_unit_id": "unit_uuid",
      "completed": true,
      "completed_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 5.2 Update Progress
```http
POST /api/progress
Authorization: Bearer {student_token}
Content-Type: application/json

{
  "learning_unit_id": "unit_uuid",
  "completed": true
}
```
**Expected Response:** `200 OK`
```json
{
  "message": "Progress updated successfully",
  "progress": {
    "learning_unit_id": "unit_uuid",
    "completed": true,
    "completed_at": "2024-01-01T00:00:00Z"
  }
}
```

---

## 👨‍🏫 LECTURER TEST SCENARIOS

### Scenario 1: Lecturer Registration & Approval

#### 1.1 Register Lecturer
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Dr. Jane Lecturer",
  "email": "jane.lecturer@university.edu",
  "unique_identifier": "LEC001",
  "password": "password123",
  "role": "lecturer"
}
```
**Expected Response:** `201 Created`
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "name": "Dr. Jane Lecturer",
    "email": "jane.lecturer@university.edu",
    "role": "lecturer",
    "status": "pending_approval"
  }
}
```

#### 1.2 Lecturer Login (Before Approval)
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "jane.lecturer@university.edu",
  "password": "password123"
}
```
**Expected Response:** `403 Forbidden`
```json
{
  "error": "Account pending approval"
}
```

#### 1.3 Lecturer Login (After Approval)
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "jane.lecturer@university.edu",
  "password": "password123"
}
```
**Expected Response:** `200 OK`
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "name": "Dr. Jane Lecturer",
    "email": "jane.lecturer@university.edu",
    "role": "lecturer"
  }
}
```

### Scenario 2: Course Management

#### 2.1 Create Public Course
```http
POST /api/courses
Authorization: Bearer {lecturer_token}
Content-Type: application/json

{
  "title": "Introduction to Programming",
  "description": "Learn the basics of programming",
  "access_type": "public"
}
```
**Expected Response:** `201 Created`
```json
{
  "course": {
    "id": "course_uuid",
    "creator_id": "lecturer_uuid",
    "title": "Introduction to Programming",
    "description": "Learn the basics of programming",
    "access_type": "public",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 2.2 Create Password-Protected Course
```http
POST /api/courses
Authorization: Bearer {lecturer_token}
Content-Type: application/json

{
  "title": "Advanced Algorithms",
  "description": "Deep dive into algorithms",
  "access_type": "password",
  "password": "algo123"
}
```
**Expected Response:** `201 Created`

#### 2.3 Create Request-Based Course
```http
POST /api/courses
Authorization: Bearer {lecturer_token}
Content-Type: application/json

{
  "title": "Research Methods",
  "description": "Graduate level research course",
  "access_type": "by_request"
}
```
**Expected Response:** `201 Created`

#### 2.4 Update Own Course
```http
PUT /api/courses/{courseId}
Authorization: Bearer {lecturer_token}
Content-Type: application/json

{
  "title": "Updated Course Title",
  "description": "Updated description",
  "access_type": "public"
}
```
**Expected Response:** `200 OK`
```json
{
  "course": {
    "id": "course_uuid",
    "title": "Updated Course Title",
    "description": "Updated description",
    "access_type": "public",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 2.5 Try to Update Another Lecturer's Course
```http
PUT /api/courses/{otherLecturerCourseId}
Authorization: Bearer {lecturer_token}
Content-Type: application/json

{
  "title": "Hacked Title"
}
```
**Expected Response:** `403 Forbidden`
```json
{
  "error": "access denied - not course owner"
}
```

#### 2.6 Delete Own Course
```http
DELETE /api/courses/{courseId}
Authorization: Bearer {lecturer_token}
```
**Expected Response:** `200 OK`
```json
{
  "message": "Course deleted successfully"
}
```

### Scenario 3: Learning Unit Management

#### 3.1 Create Learning Unit
```http
POST /api/courses/{courseId}/units
Authorization: Bearer {lecturer_token}
Content-Type: application/json

{
  "title": "Chapter 1: Variables",
  "description": "Introduction to variables and data types",
  "unit_order": 1
}
```
**Expected Response:** `201 Created`
```json
{
  "unit": {
    "id": "unit_uuid",
    "course_id": "course_uuid",
    "title": "Chapter 1: Variables",
    "description": "Introduction to variables and data types",
    "unit_order": 1,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 3.2 Update Learning Unit
```http
PUT /api/learning-units/{unitId}
Authorization: Bearer {lecturer_token}
Content-Type: application/json

{
  "title": "Updated Chapter Title",
  "description": "Updated description"
}
```
**Expected Response:** `200 OK`

#### 3.3 Delete Learning Unit
```http
DELETE /api/learning-units/{unitId}
Authorization: Bearer {lecturer_token}
```
**Expected Response:** `200 OK`
```json
{
  "message": "Learning unit deleted successfully"
}
```

### Scenario 4: Access Request Management

#### 4.1 View Pending Access Requests
```http
GET /api/courses/{courseId}/access-requests
Authorization: Bearer {lecturer_token}
```
**Expected Response:** `200 OK`
```json
{
  "requests": [
    {
      "id": "enrollment_uuid",
      "student_id": "student_uuid",
      "course_id": "course_uuid",
      "status": "pending_approval",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 4.2 Approve Access Request
```http
POST /api/access-requests/{requestId}/approve
Authorization: Bearer {lecturer_token}
Content-Type: application/json

{
  "approved": true
}
```
**Expected Response:** `200 OK`
```json
{
  "message": "Access request approved successfully"
}
```

#### 4.3 Deny Access Request
```http
POST /api/access-requests/{requestId}/approve
Authorization: Bearer {lecturer_token}
Content-Type: application/json

{
  "approved": false
}
```
**Expected Response:** `200 OK`
```json
{
  "message": "Access request denied successfully"
}
```

---

## 👑 ADMIN TEST SCENARIOS

### Scenario 1: Admin Authentication

#### 1.1 Admin Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@layai.com",
  "password": "admin123"
}
```
**Expected Response:** `200 OK`
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "name": "System Admin",
    "email": "admin@layai.com",
    "role": "admin"
  }
}
```

### Scenario 2: Lecturer Approval Management

#### 2.1 View Pending Lecturers
```http
GET /api/admin/lecturers?status=pending_approval
Authorization: Bearer {admin_token}
```
**Expected Response:** `200 OK`
```json
{
  "lecturers": [
    {
      "id": "lecturer_uuid",
      "name": "Dr. Jane Lecturer",
      "email": "jane.lecturer@university.edu",
      "unique_identifier": "LEC001",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

#### 2.2 Approve Lecturer
```http
POST /api/admin/lecturers/{lecturerId}/approve
Authorization: Bearer {admin_token}
```
**Expected Response:** `200 OK`
```json
{
  "message": "Lecturer approved successfully",
  "success": true
}
```

#### 2.3 Approve Non-Existent Lecturer
```http
POST /api/admin/lecturers/invalid-uuid/approve
Authorization: Bearer {admin_token}
```
**Expected Response:** `404 Not Found`
```json
{
  "error": "Lecturer not found"
}
```

### Scenario 3: User Management

#### 3.1 View All Users
```http
GET /api/admin/users
Authorization: Bearer {admin_token}
```
**Expected Response:** `200 OK`
```json
{
  "users": [
    {
      "id": "user_uuid",
      "name": "John Student",
      "email": "john.student@example.com",
      "role": "student",
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

#### 3.2 Get User by ID
```http
GET /api/admin/users/{userId}
Authorization: Bearer {admin_token}
```
**Expected Response:** `200 OK`
```json
{
  "id": "user_uuid",
  "name": "John Student",
  "email": "john.student@example.com",
  "unique_identifier": "STU001",
  "role": "student",
  "status": "active",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### 3.3 Create New User
```http
POST /api/admin/users
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Test User",
  "email": "test@example.com",
  "unique_identifier": "TEST001",
  "password": "password123",
  "role": "student"
}
```
**Expected Response:** `201 Created`
```json
{
  "user": {
    "id": "new_user_uuid",
    "name": "Test User",
    "email": "test@example.com",
    "role": "student",
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 3.4 Update User
```http
PUT /api/admin/users/{userId}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Updated Name",
  "status": "inactive"
}
```
**Expected Response:** `200 OK`
```json
{
  "user": {
    "id": "user_uuid",
    "name": "Updated Name",
    "status": "inactive",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 3.5 Delete User
```http
DELETE /api/admin/users/{userId}
Authorization: Bearer {admin_token}
```
**Expected Response:** `200 OK`
```json
{
  "message": "User deleted successfully"
}
```

### Scenario 4: Platform-Wide Content Management

#### 4.1 View All Courses
```http
GET /api/admin/courses
Authorization: Bearer {admin_token}
```
**Expected Response:** `200 OK`
```json
{
  "courses": [
    {
      "id": "course_uuid",
      "title": "Introduction to Programming",
      "creator_id": "lecturer_uuid",
      "access_type": "public",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

#### 4.2 Update Any Course
```http
PUT /api/admin/courses/{courseId}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "Admin Updated Title",
  "description": "Updated by admin"
}
```
**Expected Response:** `200 OK`

#### 4.3 Delete Any Course
```http
DELETE /api/admin/courses/{courseId}
Authorization: Bearer {admin_token}
```
**Expected Response:** `200 OK`
```json
{
  "message": "Course deleted successfully"
}
```

#### 4.4 View All Learning Units
```http
GET /api/admin/learning-units
Authorization: Bearer {admin_token}
```
**Expected Response:** `200 OK`

#### 4.5 Update Any Learning Unit
```http
PUT /api/admin/learning-units/{unitId}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "Admin Updated Unit",
  "description": "Updated by admin"
}
```
**Expected Response:** `200 OK`

#### 4.6 Delete Any Learning Unit
```http
DELETE /api/admin/learning-units/{unitId}
Authorization: Bearer {admin_token}
```
**Expected Response:** `200 OK`

---

## 🔒 SECURITY TEST SCENARIOS

### Scenario 1: Authentication Tests

#### 1.1 Access Protected Endpoint Without Token
```http
GET /api/enrollments/me
```
**Expected Response:** `401 Unauthorized`
```json
{
  "error": "Authentication required"
}
```

#### 1.2 Access Protected Endpoint With Invalid Token
```http
GET /api/enrollments/me
Authorization: Bearer invalid_token
```
**Expected Response:** `401 Unauthorized`
```json
{
  "error": "Invalid token"
}
```

#### 1.3 Access Protected Endpoint With Expired Token
```http
GET /api/enrollments/me
Authorization: Bearer expired_token
```
**Expected Response:** `401 Unauthorized`
```json
{
  "error": "Token expired"
}
```

### Scenario 2: Authorization Tests

#### 2.1 Student Tries to Create Course
```http
POST /api/courses
Authorization: Bearer {student_token}
Content-Type: application/json

{
  "title": "Unauthorized Course",
  "description": "This should fail"
}
```
**Expected Response:** `403 Forbidden`
```json
{
  "error": "Lecturer access required"
}
```

#### 2.2 Lecturer Tries to Access Admin Panel
```http
GET /api/admin/users
Authorization: Bearer {lecturer_token}
```
**Expected Response:** `403 Forbidden`
```json
{
  "error": "Admin access required"
}
```

#### 2.3 Student Tries to Approve Access Request
```http
POST /api/access-requests/{requestId}/approve
Authorization: Bearer {student_token}
Content-Type: application/json

{
  "approved": true
}
```
**Expected Response:** `403 Forbidden`
```json
{
  "error": "Lecturer access required"
}
```

### Scenario 3: Enrollment Security Tests

#### 3.1 Access Course Content Without Enrollment
```http
GET /api/courses/{courseId}/units
Authorization: Bearer {student_token}
```
**Expected Response:** `403 Forbidden`
```json
{
  "error": "enrollment required"
}
```

#### 3.2 Try to Join Course Twice
```http
POST /api/courses/{courseId}/join
Authorization: Bearer {student_token}
Content-Type: application/json

{}
```
**Expected Response:** `400 Bad Request`
```json
{
  "error": "already enrolled in this course"
}
```

#### 3.3 Request Access to Course Twice
```http
POST /api/courses/{courseId}/request-access
Authorization: Bearer {student_token}
Content-Type: application/json

{}
```
**Expected Response:** `400 Bad Request`
```json
{
  "error": "access request already pending"
}
```

### Scenario 4: Course Ownership Tests

#### 4.1 Lecturer Tries to Update Another's Course
```http
PUT /api/courses/{otherCourseId}
Authorization: Bearer {lecturer_token}
Content-Type: application/json

{
  "title": "Hacked Title"
}
```
**Expected Response:** `403 Forbidden`
```json
{
  "error": "access denied - not course owner"
}
```

#### 4.2 Lecturer Tries to Delete Another's Course
```http
DELETE /api/courses/{otherCourseId}
Authorization: Bearer {lecturer_token}
```
**Expected Response:** `403 Forbidden`
```json
{
  "error": "access denied - not course owner"
}
```

#### 4.3 Lecturer Tries to View Another's Access Requests
```http
GET /api/courses/{otherCourseId}/access-requests
Authorization: Bearer {lecturer_token}
```
**Expected Response:** `403 Forbidden`
```json
{
  "error": "access denied - not course owner"
}
```

---

## 📊 TEST EXECUTION CHECKLIST

### Pre-Test Setup
- [ ] Start backend server: `make run`
- [ ] Ensure database is migrated: `make migrate-up`
- [ ] Create admin account if not exists
- [ ] Clear test data if needed

### Authentication Flow Tests
- [ ] Student registration and login
- [ ] Lecturer registration (pending approval)
- [ ] Admin login
- [ ] Token validation

### Student Workflow Tests
- [ ] Course discovery
- [ ] Public course enrollment
- [ ] Password course enrollment
- [ ] Request-based course access
- [ ] Content access verification
- [ ] Progress tracking

### Lecturer Workflow Tests
- [ ] Lecturer approval process
- [ ] Course creation (all types)
- [ ] Course management
- [ ] Learning unit management
- [ ] Access request handling

### Admin Workflow Tests
- [ ] Lecturer approval
- [ ] User management (CRUD)
- [ ] Platform-wide content management
- [ ] System oversight

### Security Tests
- [ ] Authentication requirements
- [ ] Role-based access control
- [ ] Course ownership verification
- [ ] Enrollment verification
- [ ] Cross-role access prevention

### Error Handling Tests
- [ ] Invalid input validation
- [ ] Resource not found scenarios
- [ ] Duplicate action prevention
- [ ] Permission denied scenarios

---

## 🛠️ Testing Tools

### Recommended Tools
1. **Postman** - Import this file as a collection
2. **curl** - Command line testing
3. **HTTPie** - User-friendly HTTP client
4. **Insomnia** - REST client

### Environment Variables
```
BASE_URL=http://localhost:8080/api
STUDENT_TOKEN=<student_jwt_token>
LECTURER_TOKEN=<lecturer_jwt_token>
ADMIN_TOKEN=<admin_jwt_token>
```

### Sample curl Commands
```bash
# Student registration
curl -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Student","email":"john@example.com","unique_identifier":"STU001","password":"password123","role":"student"}'

# Student login
curl -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'

# Join course
curl -X POST $BASE_URL/courses/{courseId}/join \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 📝 Notes

- Replace `{courseId}`, `{userId}`, etc. with actual UUIDs
- Save JWT tokens from login responses for subsequent requests
- Test in the order presented for best results
- Some tests depend on previous test data (e.g., course creation before enrollment)
- Admin account should be pre-created in the system
- All timestamps are in ISO 8601 format (UTC)

---

**Happy Testing! 🚀**