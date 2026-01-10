# Supabase Database Setup for ThreadCraft

This guide explains how to set up Supabase database storage for ThreadCraft progress tracking.

## Overview

ThreadCraft now stores your **API credentials and thread progress** in a Supabase database with encryption. This means:
- **Credentials persist until you disconnect** - enter them once, use forever
- **No more daily copy-paste** - your API keys are saved securely
- **Thread URLs encrypted** - stored safely with your progress
- **All data encrypted** - credentials and thread data protected with Fernet encryption

## Prerequisites

- A Supabase account (free tier works)
- Access to your Supabase project's SQL editor

## Setup Steps

### 1. Create the Table

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase_migration.sql`
4. Paste and run the SQL migration

This creates a table called `threadcraft_users` with:
- **Encrypted credentials storage** - All API keys encrypted with Fernet
- **Encrypted thread ID storage** - Thread URLs encrypted separately
- **User identifier hashing** - SHA-256 hash (session ID + salt)
- **Automatic timestamp tracking** - Created/updated timestamps

### 2. Get Your Supabase Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy your **Project URL** (e.g., `https://xxxxx.supabase.co`)
3. Copy your **anon/public key** (under "Project API keys")

### 3. Configure Environment Variables

Add these environment variables to your backend deployment:

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your-anon-key-here
DATABASE_SALT=your-random-salt-string-here
```

**Important**: 
- Change `DATABASE_SALT` to a random, secret string (at least 32 characters)
- Never commit the salt to version control
- Use different salts for different environments (dev/prod)

Example salt generation:
```bash
# Linux/Mac
openssl rand -hex 32

# Python
python -c "import secrets; print(secrets.token_hex(32))"
```

### 4. Install Dependencies

The Supabase client is already added to `requirements.txt`. If deploying:

```bash
pip install -r requirements.txt
```

## How It Works

### Encryption Flow

1. **User Identifier Hashing**:
   - Your session ID is combined with a salt
   - SHA-256 hash is generated (64-character hex string)
   - This hash is stored as `user_identifier_hash`

2. **Credentials Encryption**:
   - All API credentials (keys, tokens) are encrypted using Fernet (symmetric encryption)
   - Encryption key is derived from your session ID
   - Encrypted data is base64-encoded before storage
   - Credentials persist until you click "Disconnect"

3. **Thread ID Encryption**:
   - Thread URL/ID is encrypted using Fernet (symmetric encryption)
   - Same encryption key derived from session ID
   - Encrypted data is base64-encoded before storage

4. **Decryption**:
   - When loading, your session ID is used to derive the same encryption key
   - Both credentials and thread ID are decrypted on-the-fly
   - Original data is never stored in plain text

### Fallback Behavior

**Important**: If Supabase is not configured or unavailable:
- **Credentials cannot be stored** - Users must enter API keys every time
- Thread progress falls back to JSON file storage (`progress.json`)
- Supabase is **required** for persistent credential storage

## Security Features

✅ **Credentials Encryption**: All API keys encrypted with Fernet (AES-128)
✅ **Thread Encryption**: Thread IDs encrypted separately
✅ **Hashing**: User identifiers hashed with SHA-256 + salt
✅ **No Plain Text**: Sensitive data never stored in readable format
✅ **Session-Based Keys**: Each user has unique encryption keys derived from session ID
✅ **Permanent Until Disconnect**: Credentials persist until explicit disconnect

## Troubleshooting

### Database Not Connecting

1. Verify `SUPABASE_URL` and `SUPABASE_KEY` are correct
2. Check Supabase project is active
3. Ensure table `threadcraft_progress` exists (run migration again if needed)
4. Check backend logs for specific error messages

### Migration Errors

- Ensure you have proper permissions in Supabase
- Check that the table doesn't already exist (or drop it first)
- Verify PostgreSQL version compatibility

### Progress Not Saving

- Check backend logs for database errors
- Verify environment variables are set correctly
- Try resetting progress (it will fall back to file if DB fails)

## Migration from Previous Version

If you're currently using the old session-based approach:

1. Set up Supabase as described above
2. Enter your API credentials once in the Settings page
3. Your credentials will be saved permanently (encrypted in database)
4. Use "Continue Existing Thread" to re-link your thread if needed
5. Your progress and credentials now persist across sessions

**No more daily credential entry!** Once connected, your credentials stay saved until you click "Disconnect".

## Support

If you encounter issues:
1. Check backend logs for error messages
2. Verify Supabase dashboard shows the table
3. Test database connection from Supabase SQL editor
4. Ensure all environment variables are correctly set

