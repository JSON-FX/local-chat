// Load environment variables first
import "./env";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { NextRequest } from 'next/server';
import { getDatabase } from './database';
import { User, CreateUserData, Session, CreateSessionData, AuthResponse } from './models';

// JWT configuration - use fixed secret for development
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-localchat-jwt-key-do-not-use-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET not set in environment. Using fixed development secret');
}

export class AuthService {
  
  // Hash password
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  // Verify password
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Generate JWT token
  static generateToken(userId: number, sessionId: string): string {
    console.log(`[AuthService] Generating token with JWT_SECRET: ${JWT_SECRET.substring(0, 10)}...`);
    return jwt.sign(
      { userId, sessionId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );
  }

  // Verify JWT token
  static verifyToken(token: string): { userId: number; sessionId: string } | null {
    try {
      console.log(`[AuthService] Verifying token with JWT_SECRET: ${JWT_SECRET.substring(0, 10)}...`);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return { userId: decoded.userId, sessionId: decoded.sessionId };
    } catch (error) {
      return null;
    }
  }

  // Create new user
  static async createUser(userData: CreateUserData): Promise<User> {
    const db = await getDatabase();
    
    try {
      // Check if username already exists
      const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [userData.username]);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Hash password
      const passwordHash = await this.hashPassword(userData.password);

      // Insert user
      const result = await db.run(
        'INSERT INTO users (username, password_hash, role, profile_data) VALUES (?, ?, ?, ?)',
        [
          userData.username,
          passwordHash,
          userData.role || 'user',
          userData.profile_data ? JSON.stringify(userData.profile_data) : null
        ]
      );

      // Get the inserted ID with proper type handling
      let insertedId;
      if (result && typeof result === 'object') {
        insertedId = (result as any).lastID || (result as any).lastId || (result as any).insertId;
      }
      
      if (!insertedId) {
        // Fallback: get the most recently created user with this username
        const user = await db.get('SELECT * FROM users WHERE username = ? ORDER BY id DESC LIMIT 1', [userData.username]);
        if (!user) {
          throw new Error('Failed to retrieve created user');
        }
        return user;
      }

      // Get created user
      const user = await db.get('SELECT * FROM users WHERE id = ?', [insertedId]);
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Login user
  static async login(username: string, password: string, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const db = await getDatabase();

    try {
      // Get user by username
      const user = await db.get('SELECT * FROM users WHERE username = ? AND status = ?', [username, 'active']);
      if (!user) {
        throw new Error('Invalid username or password');
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid username or password');
      }

      // Update last login
      await db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

      // Create session
      const sessionId = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + SESSION_DURATION).toISOString();

      await db.run(
        'INSERT INTO sessions (id, user_id, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
        [sessionId, user.id, expiresAt, ipAddress, userAgent]
      );

      // Generate JWT token
      const token = this.generateToken(user.id, sessionId);

      // Return user data without password hash
      const { password_hash, ...userWithoutPassword } = user;
      
      return {
        user: userWithoutPassword,
        token,
        expires_at: expiresAt
      };
    } catch (error) {
      throw error;
    }
  }

  // Logout user
  static async logout(sessionId: string): Promise<void> {
    const db = await getDatabase();

    try {
      await db.run('UPDATE sessions SET is_active = 0 WHERE id = ?', [sessionId]);
    } catch (error) {
      throw error;
    }
  }

  // Validate session
  static async validateSession(sessionId: string): Promise<User | null> {
    const db = await getDatabase();

    try {
      const session = await db.get(
        `SELECT s.*, u.* FROM sessions s 
         JOIN users u ON s.user_id = u.id 
         WHERE s.id = ? AND s.is_active = 1 AND s.expires_at > CURRENT_TIMESTAMP AND u.status = 'active'`,
        [sessionId]
      );

      if (!session) {
        return null;
      }

      // Return user data without password hash
      const { password_hash, ...userWithoutPassword } = session;
      return userWithoutPassword;
    } catch (error) {
      return null;
    }
  }

  // Get user by ID
  static async getUserById(userId: number): Promise<User | null> {
    const db = await getDatabase();

    try {
      const user = await db.get('SELECT * FROM users WHERE id = ? AND status = ?', [userId, 'active']);
      return user || null;
    } catch (error) {
      return null;
    }
  }

  // Update user password
  static async updatePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const db = await getDatabase();

    try {
      // Get current user
      const user = await db.get('SELECT password_hash FROM users WHERE id = ?', [userId]);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await this.verifyPassword(currentPassword, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password
      await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, userId]);

      // Invalidate all sessions for this user (force re-login)
      await db.run('UPDATE sessions SET is_active = 0 WHERE user_id = ?', [userId]);
    } catch (error) {
      throw error;
    }
  }

  // Clean up expired sessions
  static async cleanupExpiredSessions(): Promise<void> {
    const db = await getDatabase();

    try {
      await db.run('UPDATE sessions SET is_active = 0 WHERE expires_at < CURRENT_TIMESTAMP AND is_active = 1');
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
    }
  }
}

// Middleware helper for Next.js API routes
export const requireAuth = async (req: NextRequest): Promise<User> => {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);
  const decoded = AuthService.verifyToken(token);
  if (!decoded) {
    throw new Error('Invalid token');
  }

  const user = await AuthService.validateSession(decoded.sessionId);
  if (!user) {
    throw new Error('Session invalid or expired');
  }

  return user;
};

// Role-based access control
export const requireRole = (allowedRoles: string[]) => {
  return async (req: NextRequest): Promise<User> => {
    const user = await requireAuth(req);
    
    if (!allowedRoles.includes(user.role)) {
      throw new Error('Insufficient permissions');
    }

    return user;
  };
}; 