import { Database } from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

// Create test database before all tests
beforeAll(async () => {
  // Ensure test database directory exists
  const testDbDir = path.join(__dirname, '..', 'test-db');
  if (!fs.existsSync(testDbDir)) {
    fs.mkdirSync(testDbDir, { recursive: true });
  }
});

// Clean up after all tests
afterAll(async () => {
  // Optional: Clean up test database
});
