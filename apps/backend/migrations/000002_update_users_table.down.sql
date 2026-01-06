-- migrations/000002_rename_nim_to_unique_identifier_in_users.down.sql

ALTER TABLE users RENAME COLUMN unique_identifier TO nim;