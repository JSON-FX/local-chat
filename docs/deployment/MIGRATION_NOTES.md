# Database Migration: Add file_name Column

## Overview
This migration adds a `file_name` column to the `messages` table to store custom file names for uploaded files.

## Migration Details
- **Column Name**: `file_name`
- **Type**: TEXT
- **Default**: NULL
- **Purpose**: Stores user-specified file names for uploaded files

## Deployment Instructions

### For Docker Deployments

1. **Pull the latest code**:
   ```bash
   cd /path/to/lgu-chat
   git pull origin main
   ```

2. **Rebuild the Docker image** (if using local builds):
   ```bash
   docker compose -f docker-compose.prod.yml build
   ```

3. **Run the migration**:
   ```bash
   # The migration will run automatically when the application starts
   docker compose -f docker-compose.prod.yml restart app
   ```

4. **Verify the migration**:
   ```bash
   # Check the logs to ensure migration ran successfully
   docker compose -f docker-compose.prod.yml logs app | grep "file_name column"
   
   # Or directly check the database
   docker compose -f docker-compose.prod.yml exec app sqlite3 data/localchat.db "PRAGMA table_info(messages);" | grep file_name
   ```

### For Non-Docker Deployments

1. **Pull the latest code**:
   ```bash
   cd /path/to/lgu-chat
   git pull origin main
   ```

2. **Install dependencies** (if any were added):
   ```bash
   npm install
   ```

3. **Run the database initialization script**:
   ```bash
   npm run init-db
   # or
   npx tsx scripts/init-db.ts
   ```

4. **Verify the migration**:
   ```bash
   sqlite3 data/localchat.db "PRAGMA table_info(messages);" | grep file_name
   ```

5. **Restart the application**:
   ```bash
   # Using PM2
   pm2 restart lgu-chat
   
   # Or using systemd
   sudo systemctl restart lgu-chat
   ```

## Automatic Migration
The migration is integrated into the application startup process. When the application starts:
1. It checks if the `file_name` column exists in the `messages` table
2. If not, it automatically adds the column
3. The migration is logged in the application logs

## Rollback Instructions
If you need to rollback this migration:

```sql
-- Connect to the database
sqlite3 data/localchat.db

-- Remove the column (SQLite doesn't support DROP COLUMN directly)
-- You would need to recreate the table without the column
-- This is generally not recommended unless absolutely necessary
```

## Notes
- This migration is backwards compatible
- Existing messages will have NULL values for file_name
- The application will continue to work normally during and after the migration
- No downtime is required as the migration runs during startup
