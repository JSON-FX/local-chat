// Load environment variables first
import "./env";
import { randomBytes, createHash } from 'crypto';
import { NextRequest } from 'next/server';
import { getDatabase } from './database';
import { ssoService } from './sso';

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export class AuthService {
  // Hash an SSO token for storage (we don't store raw tokens)
  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // Map SSO role to local chat role
  static mapSsoRole(ssoRole: string): 'admin' | 'user' {
    switch (ssoRole) {
      case 'super_administrator':
      case 'administrator':
        return 'admin';
      default:
        return 'user';
    }
  }

  // Authenticate user via SSO token (called after SSO callback)
  static async authenticateWithSso(
    token: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: any; sessionId: string }> {
    // Call SSO authorize endpoint
    const authResult = await ssoService.authorizeEmployee(token);
    if (!authResult || !authResult.authorized) {
      throw new Error(authResult?.message || 'SSO authorization failed');
    }

    // Get full employee data
    const employeeData = await ssoService.getEmployee(token);

    // Upsert local user
    const user = await this.upsertLocalUser(
      employeeData || authResult.employee,
      authResult.role
    );

    // Create session
    const sessionId = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + SESSION_DURATION).toISOString();

    const db = await getDatabase();
    await db.run(
      'INSERT INTO sessions (id, user_id, sso_token_hash, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
      [sessionId, user.id, tokenHash, expiresAt, ipAddress, userAgent]
    );

    // Update last login
    await db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    // Cache the validation result
    ssoService.cacheValidation(token, employeeData || authResult.employee, authResult.role);

    return { user, sessionId };
  }

  // Upsert local user from SSO employee data
  static async upsertLocalUser(ssoEmployee: any, ssoRole: string): Promise<any> {
    const db = await getDatabase();
    const localRole = this.mapSsoRole(ssoRole);
    const uuid = ssoEmployee.uuid;
    const fullName = ssoEmployee.full_name || `${ssoEmployee.first_name || ''} ${ssoEmployee.last_name || ''}`.trim();
    const email = ssoEmployee.email || '';
    const position = ssoEmployee.position || '';
    const officeName = ssoEmployee.office?.name || '';

    // Try to find existing user
    const existingUser = await db.get(
      'SELECT * FROM users WHERE sso_employee_uuid = ?',
      [uuid]
    );

    if (existingUser) {
      // Update profile
      await db.run(
        `UPDATE users SET
          username = ?, email = ?, role = ?, sso_role = ?,
          full_name = ?, position = ?, office_name = ?,
          profile_synced_at = CURRENT_TIMESTAMP, status = 'active'
        WHERE sso_employee_uuid = ?`,
        [fullName, email, localRole, ssoRole, fullName, position, officeName, uuid]
      );
      return { ...existingUser, role: localRole, sso_role: ssoRole, full_name: fullName, email, position, office_name: officeName };
    }

    // Create new user
    await db.run(
      `INSERT INTO users (sso_employee_uuid, username, email, role, sso_role, full_name, position, office_name, profile_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [uuid, fullName, email, localRole, ssoRole, fullName, position, officeName]
    );

    const newUser = await db.get('SELECT * FROM users WHERE sso_employee_uuid = ?', [uuid]);
    return newUser;
  }

  // Validate an SSO token - fast path via session lookup, slow path via SSO API
  static async validateSsoToken(token: string): Promise<any | null> {
    const db = await getDatabase();
    const tokenHash = this.hashToken(token);

    // Fast path: check local session by token hash
    const session = await db.get(
      `SELECT s.*, u.* FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.sso_token_hash = ? AND s.is_active = 1 AND s.expires_at > CURRENT_TIMESTAMP AND u.status = 'active'`,
      [tokenHash]
    );

    if (session) {
      // Update last activity
      await db.run('UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE sso_token_hash = ?', [tokenHash]);
      const { sso_token_hash, ...userData } = session;
      return userData;
    }

    // Slow path: validate via SSO API (with cache)
    try {
      const cached = ssoService.getCachedValidation(token);
      if (cached) {
        // Find user by UUID from cached data
        const uuid = cached.employee?.uuid || cached.employee?.data?.uuid;
        if (uuid) {
          const user = await db.get('SELECT * FROM users WHERE sso_employee_uuid = ?', [uuid]);
          if (user) return user;
        }
      }

      const result = await ssoService.validateToken(token);
      if (result && result.valid) {
        const employee = result.data;
        const uuid = employee?.uuid || employee?.data?.uuid;
        if (uuid) {
          const user = await db.get('SELECT * FROM users WHERE sso_employee_uuid = ?', [uuid]);
          return user;
        }
      }
    } catch {
      // SSO is down, no cached session found
    }

    return null;
  }

  // Logout - invalidate local session only
  static async logout(sessionId: string): Promise<void> {
    const db = await getDatabase();
    await db.run('UPDATE sessions SET is_active = 0 WHERE id = ?', [sessionId]);
  }

  // Logout by token hash
  static async logoutByTokenHash(tokenHash: string): Promise<void> {
    const db = await getDatabase();
    await db.run('UPDATE sessions SET is_active = 0 WHERE sso_token_hash = ?', [tokenHash]);
  }

  // Invalidate all sessions for a user (used for logout-all propagation)
  static async invalidateAllSessions(userId: number): Promise<void> {
    const db = await getDatabase();
    await db.run('UPDATE sessions SET is_active = 0 WHERE user_id = ?', [userId]);
  }

  // Get user by ID
  static async getUserById(userId: number): Promise<any | null> {
    const db = await getDatabase();
    const user = await db.get('SELECT * FROM users WHERE id = ? AND status = ?', [userId, 'active']);
    return user || null;
  }

  // Clean up expired sessions
  static async cleanupExpiredSessions(): Promise<void> {
    const db = await getDatabase();
    await db.run('UPDATE sessions SET is_active = 0 WHERE expires_at < CURRENT_TIMESTAMP AND is_active = 1');
  }
}

// Middleware helper for Next.js API routes
export const requireAuth = async (req: NextRequest): Promise<any> => {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);
  const user = await AuthService.validateSsoToken(token);
  if (!user) {
    throw new Error('Invalid or expired token');
  }

  return user;
};

// Role-based access control
export const requireRole = (allowedRoles: string[]) => {
  return async (req: NextRequest): Promise<any> => {
    const user = await requireAuth(req);
    if (!allowedRoles.includes(user.role)) {
      throw new Error('Insufficient permissions');
    }
    return user;
  };
};
