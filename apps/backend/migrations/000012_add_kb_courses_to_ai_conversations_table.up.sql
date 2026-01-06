ALTER TABLE ai_conversations
ADD COLUMN IF NOT EXISTS knowledge_base_course_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];

