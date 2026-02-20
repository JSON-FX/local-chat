import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getDatabase } from '@/lib/database';
import { auditLog } from '@/lib/auditLog';

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
      conditions.push('(username LIKE ? OR full_name LIKE ? OR email LIKE ?)');
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
        id, sso_employee_uuid, username, role, created_at, last_login, status,
        full_name, position, office_name, email, sso_role,
        avatar_path, profile_synced_at
      FROM users
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
      LIMIT ? OFFSET ?
    `;

    const users = await db.all(usersQuery, [...params, limit, offset]);

    // Get active session count for each user
    const userIds = users.map(u => u.id);
    const sessionCounts = userIds.length > 0
      ? await db.all(`
          SELECT user_id, COUNT(*) as active_sessions
          FROM sessions
          WHERE user_id IN (${userIds.map(() => '?').join(',')})
          AND is_active = 1
          AND expires_at > datetime('now')
          GROUP BY user_id
        `, userIds)
      : [];

    const sessionMap = Object.fromEntries(sessionCounts.map(s => [s.user_id, s.active_sessions]));

    // Add session info to users
    const enrichedUsers = users.map(u => ({
      ...u,
      active_sessions: sessionMap[u.id] || 0
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

// POST /api/admin/users - User creation via admin is no longer supported with SSO
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'User creation is managed by LGU-SSO. Users are automatically provisioned on first SSO login.'
    },
    { status: 410 }
  );
}
