-- Migration: Add system user for system messages
-- This user is needed for system messages like "User X was added/removed from group"

INSERT OR IGNORE INTO users (
  id, 
  username, 
  password_hash, 
  role, 
  name, 
  status,
  created_at
) VALUES (
  0, 
  'system', 
  'system', 
  'system', 
  'System', 
  'active',
  datetime('now')
);
