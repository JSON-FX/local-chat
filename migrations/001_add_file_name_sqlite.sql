-- Add file_name column to messages table
ALTER TABLE messages ADD COLUMN file_name TEXT DEFAULT NULL;
