ALTER TABLE ai_conversations
ADD COLUMN IF NOT EXISTS knowledge_base_learning_unit_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];

