-- Recreate flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID NOT NULL REFERENCES flashcard_sets(id) ON DELETE CASCADE,
  front_text TEXT NOT NULL,
  back_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrate data back from flashcards_data to flashcards table
INSERT INTO flashcards (id, set_id, front_text, back_text, created_at, updated_at)
SELECT 
    COALESCE((card->>'id')::UUID, gen_random_uuid()),
    fs.id as set_id,
    card->>'front_text',
    card->>'back_text',
    COALESCE((card->>'created_at')::TIMESTAMPTZ, NOW()),
    COALESCE((card->>'updated_at')::TIMESTAMPTZ, NOW())
FROM flashcard_sets fs,
LATERAL jsonb_array_elements(flashcards_data) as card;

-- Drop flashcards_data column
ALTER TABLE flashcard_sets DROP COLUMN flashcards_data;