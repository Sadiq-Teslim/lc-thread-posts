-- ThreadCraft User Data Storage Migration
-- Run this SQL in your Supabase SQL Editor to create the user data table

-- Create the threadcraft_users table (stores both credentials and progress)
CREATE TABLE IF NOT EXISTS threadcraft_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Hashed user identifier (SHA-256 hash of session_id + salt)
    -- This allows lookup without exposing session IDs
    user_identifier_hash TEXT NOT NULL UNIQUE,
    
    -- Encrypted API credentials (JSON string encrypted using Fernet)
    -- Contains: api_key, api_secret, access_token, access_token_secret, bearer_token
    encrypted_credentials TEXT NOT NULL,
    
    -- Encrypted thread ID/URL (encrypted using Fernet before insertion)
    -- Stored as TEXT to handle base64-encoded encrypted strings
    -- NULL if no active thread
    encrypted_thread_id TEXT,
    
    -- Current day number (0-indexed)
    current_day INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps for tracking
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Index for faster lookups by user identifier
    CONSTRAINT user_identifier_hash_check CHECK (LENGTH(user_identifier_hash) = 64)
);

-- Create index on user_identifier_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_threadcraft_users_user_hash 
    ON threadcraft_users(user_identifier_hash);

-- Create index on updated_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_threadcraft_users_updated_at 
    ON threadcraft_users(updated_at);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_threadcraft_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row updates
CREATE TRIGGER trigger_update_threadcraft_users_updated_at
    BEFORE UPDATE ON threadcraft_users
    FOR EACH ROW
    EXECUTE FUNCTION update_threadcraft_users_updated_at();

-- Optional: Enable Row Level Security (RLS) if needed
-- ALTER TABLE threadcraft_progress ENABLE ROW LEVEL SECURITY;

-- Optional: Create a policy that allows users to only access their own rows
-- This would require Supabase Auth integration
-- CREATE POLICY "Users can only access their own progress"
--     ON threadcraft_progress
--     FOR ALL
--     USING (user_identifier_hash = (SELECT encode(sha256((auth.uid()::text || 'your-salt-here')::bytea), 'hex')));

COMMENT ON TABLE threadcraft_users IS 'Stores encrypted credentials and thread progress for ThreadCraft users';
COMMENT ON COLUMN threadcraft_users.user_identifier_hash IS 'SHA-256 hash of (session_id + salt) - used to identify users without exposing session IDs';
COMMENT ON COLUMN threadcraft_users.encrypted_credentials IS 'Fernet-encrypted JSON string containing all API credentials (api_key, api_secret, access_token, access_token_secret, bearer_token)';
COMMENT ON COLUMN threadcraft_users.encrypted_thread_id IS 'Fernet-encrypted thread ID/URL, base64-encoded. NULL if no active thread.';
COMMENT ON COLUMN threadcraft_users.current_day IS 'Current day number in the thread (0-indexed)';

