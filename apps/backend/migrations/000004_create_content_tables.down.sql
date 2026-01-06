-- Drop tables in reverse order to respect foreign key constraints
DROP TABLE IF EXISTS flashcards;
DROP TABLE IF EXISTS flashcard_sets;
DROP TABLE IF EXISTS quizzes;
DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS unit_completions;
DROP TABLE IF EXISTS student_progress;
DROP TABLE IF EXISTS learning_units;
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS courses;

-- Drop enums
DROP TYPE IF EXISTS enrollment_status;
DROP TYPE IF EXISTS access_type;