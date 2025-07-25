// Load environment variables as early as possible
import dotenv from 'dotenv';

// Configure dotenv if not already configured
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith('dev-secret')) {
  dotenv.config();
}

export {};
