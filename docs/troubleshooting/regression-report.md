# Regression Testing Report

## Date: 2025-07-23

## Test Summary

### 1. Unit Tests ✅
- **Test: Insert text-only message** - PASSED
  - Successfully mocked MessageService.sendMessage
  - Verified message insertion with correct properties
  - No file properties included as expected

- **Test: Insert message with file_name** - PASSED
  - Successfully mocked MessageService.sendMessage with file properties
  - Verified message insertion with file metadata
  - All file properties (file_name, file_path, file_size) included

### 2. Integration Tests (API) ⚠️
- **Test: Send text-only message via API** - PASSED
  - Message successfully sent through /api/messages/send
  - Response includes message ID and content
  - No file properties included as expected

- **Test: Send message with file via API** - PARTIAL PASS
  - Message successfully sent through /api/messages/send
  - Response indicates success
  - **ISSUE**: File properties (file_name, file_path, file_size) are not being saved to database
  - Root cause: The API endpoint passes file data to MessageService, but the data is not persisted

### 3. Database Verification ⚠️
- **Test: Verify text messages in DB** - PASSED
  - Text-only messages are correctly stored
  - All message properties are preserved

- **Test: Verify file messages in DB** - FAILED
  - Messages with file attachments are stored but without file metadata
  - file_name, file_path, and file_size columns remain NULL
  - Direct database insertion works correctly, indicating issue is in application layer

## Issues Found

1. **File Attachment Data Not Persisting**
   - When sending messages with file attachments through the API, the file metadata (file_name, file_path, file_size) is not saved to the database
   - The MessageService appears to be receiving the data but not inserting it correctly
   - This would cause the UI to show "Failed to send message" toast for file uploads

## Recommendations

1. Debug the MessageService.sendMessage method to ensure file properties are being passed to the SQL INSERT statement
2. Add logging to track file property values through the message creation flow
3. Consider adding integration tests that verify database state after API calls
4. Add validation tests for invalid file properties (missing required fields, invalid paths, etc.)

## Test Execution Commands

```bash
# Run unit tests
npm test

# Run manual integration tests
node tests/manual-ui-test.js

# Verify database state
sqlite3 /var/www/html/local-chat/data/localchat.db "SELECT id, content, file_name, file_path, file_size FROM messages ORDER BY id DESC LIMIT 5;"
```
