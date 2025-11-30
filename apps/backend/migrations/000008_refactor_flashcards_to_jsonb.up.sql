-- Add flashcards_data column to flashcard_sets
ALTER TABLE flashcard_sets ADD COLUMN flashcards_data JSONB DEFAULT '[]'::jsonb NOT NULL;

-- Migrate data from flashcards table to flashcards_data column
WITH aggregated_flashcards AS (
    SELECT 
        set_id, 
        jsonb_agg(
            jsonb_build_object(
                'id', id,
                'front_text', front_text,
                'back_text', back_text,
                'created_at', created_at,
                'updated_at', updated_at
            ) ORDER BY created_at ASC
        ) as data
    FROM flashcards
    GROUP BY set_id
)
UPDATE flashcard_sets
SET flashcards_data = aggregated_flashcards.data
FROM aggregated_flashcards
WHERE flashcard_sets.id = aggregated_flashcards.set_id;

-- Drop flashcards table
DROP TABLE flashcards;