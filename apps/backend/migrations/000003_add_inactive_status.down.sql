-- Note: PostgreSQL doesn't support removing enum values directly
-- This would require recreating the enum type, which is complex
-- For now, we'll leave this as a comment explaining the limitation

-- To properly rollback this migration, you would need to:
-- 1. Update all records using 'inactive' to another status
-- 2. Drop and recreate the enum without 'inactive'
-- 3. Recreate the table with the new enum
-- This is complex and potentially destructive, so we're leaving it as a no-op

-- ALTER TYPE user_status DROP VALUE 'inactive'; -- This syntax doesn't exist in PostgreSQL