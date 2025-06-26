import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getDatabase } from '@/lib/database';
import { auditLog } from '@/lib/auditLog';
import { AuthService } from '@/lib/auth';
import { CreateUserData } from '@/lib/models';

// GET /api/admin/users - List all users with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(['admin'])(request);
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    const offset = (page - 1) * limit;
    const db = await getDatabase();
    
    // Build query conditions
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (search) {
      conditions.push('(username LIKE ? OR name LIKE ? OR email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }
    
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const countResult = await db.get(countQuery, params);
    const total = countResult.total;
    
    // Get users with pagination
    const usersQuery = `
      SELECT 
        id, username, role, created_at, last_login, status,
        name, last_name, middle_name, position, department, 
        email, mobile_number, avatar_path, ban_reason, banned_until,
        failed_login_attempts, last_failed_login
      FROM users 
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
      LIMIT ? OFFSET ?
    `;
    
    const users = await db.all(usersQuery, [...params, limit, offset]);
    
    // Get active session count for each user
    const userIds = users.map(u => u.id);
    const sessionCounts = await db.all(`
      SELECT user_id, COUNT(*) as active_sessions
      FROM sessions 
      WHERE user_id IN (${userIds.map(() => '?').join(',')}) 
      AND is_active = 1 
      AND expires_at > datetime('now')
      GROUP BY user_id
    `, userIds);
    
    const sessionMap = Object.fromEntries(sessionCounts.map(s => [s.user_id, s.active_sessions]));
    
    // Add session info to users
    const enrichedUsers = users.map(user => ({
      ...user,
      active_sessions: sessionMap[user.id] || 0
    }));
    
    // Log admin action
    await auditLog.userUpdated(user.id, user.username, 0, { action: 'users_list_viewed', count: userIds.length });
    
    return NextResponse.json({
      success: true,
      data: {
        users: enrichedUsers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error: any) {
    console.error('Admin users list error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get users' },
      { status: error.status || 500 }
    );
  }
}

// POST /api/admin/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireRole(['admin'])(request);
    const body = await request.json();
    
    const { username, password, role, name, last_name, middle_name, position, department, email, mobile_number } = body;
    
    // Validate required fields
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }
    
    // Validate role
    const validRoles = ['admin', 'moderator', 'user'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role specified' },
        { status: 400 }
      );
    }
    
    // Create user data
    const userData: CreateUserData = {
      username,
      password,
      role: role || 'user',
      profile_data: {
        name: name || '',
        last_name: last_name || '',
        middle_name: middle_name || '',
        position: position || '',
        department: department || '',
        email: email || '',
        mobile_number: mobile_number || ''
      }
    };
    
    // Create the user
    const newUser = await AuthService.createUser(userData);
    
    // Update additional profile fields if provided
    if (name || last_name || middle_name || position || department || email || mobile_number) {
      const db = await getDatabase();
      await db.run(`
        UPDATE users SET 
          name = ?, last_name = ?, middle_name = ?, position = ?, 
          department = ?, email = ?, mobile_number = ?
        WHERE id = ?
      `, [
        name || null, last_name || null, middle_name || null, 
        position || null, department || null, email || null, 
        mobile_number || null, newUser.id
      ]);
    }
    
    // Log admin action
    await auditLog.userCreated(adminUser.id, adminUser.username, newUser.id, newUser.username);
    
    // Return user without password hash
    const { password_hash, ...userResponse } = newUser;
    
    return NextResponse.json({
      success: true,
      data: { user: userResponse },
      message: 'User created successfully'
    });
    
  } catch (error: any) {
    console.error('Admin user creation error:', error);
    
    // Handle specific database errors
    if (error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { success: false, error: 'Username already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create user' },
      { status: error.status || 500 }
    );
  }
} 