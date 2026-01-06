-- migrations/000002_rename_nim_to_unique_identifier_in_users.up.sql

ALTER TABLE users RENAME COLUMN nim TO unique_identifier;