-- Create generated_quizzes table
CREATE TABLE IF NOT EXISTS generated_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    quiz_data JSONB NOT NULL,
    source_unit_ids UUID[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create generated_flashcard_sets table
CREATE TABLE IF NOT EXISTS generated_flashcard_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    flashcards_data JSONB NOT NULL,
    source_unit_ids UUID[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_generated_quizzes_user_id ON generated_quizzes(user_id);
CREATE INDEX idx_generated_quizzes_course_id ON generated_quizzes(course_id);
CREATE INDEX idx_generated_flashcard_sets_user_id ON generated_flashcard_sets(user_id);
CREATE INDEX idx_generated_flashcard_sets_course_id ON generated_flashcard_sets(course_id);