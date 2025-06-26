import { getDatabase } from './database';
import { AuditLog, CreateAuditLogData } from './models';

// Audit Log Service for comprehensive activity tracking
export class AuditLogService {
  
  // Create an audit log entry
  static async log(data: CreateAuditLogData): Promise<number> {
    const db = await getDatabase();
    
    try {
      const result = await db.run(`
        INSERT INTO audit_logs (
          user_id, username, action, entity_type, entity_id, 
          details, ip_address, user_agent, severity
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.user_id || null,
        data.username || null,
        data.action,
        data.entity_type,
        data.entity_id || null,
        data.details ? JSON.stringify(data.details) : null,
        data.ip_address || null,
        data.user_agent || null,
        data.severity || 'info'
      ]);
      
      return result.lastID as number;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      throw error;
    }
  }

  // Get audit logs with filtering and pagination
  static async getLogs(options: {
    page?: number;
    limit?: number;
    user_id?: number;
    username?: string;
    action?: string;
    entity_type?: string;
    entity_id?: number;
    severity?: string;
    start_date?: string;
    end_date?: string;
    ip_address?: string;
  } = {}): Promise<{ logs: AuditLog[], total: number, page: number, pages: number }> {
    const db = await getDatabase();
    
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;
    
    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (options.user_id) {
      conditions.push('user_id = ?');
      params.push(options.user_id);
    }
    
    if (options.username) {
      conditions.push('username LIKE ?');
      params.push(`%${options.username}%`);
    }
    
    if (options.action) {
      conditions.push('action LIKE ?');
      params.push(`%${options.action}%`);
    }
    
    if (options.entity_type) {
      conditions.push('entity_type = ?');
      params.push(options.entity_type);
    }
    
    if (options.entity_id) {
      conditions.push('entity_id = ?');
      params.push(options.entity_id);
    }
    
    if (options.severity) {
      conditions.push('severity = ?');
      params.push(options.severity);
    }
    
    if (options.start_date) {
      conditions.push('timestamp >= ?');
      params.push(options.start_date);
    }
    
    if (options.end_date) {
      conditions.push('timestamp <= ?');
      params.push(options.end_date);
    }
    
    if (options.ip_address) {
      conditions.push('ip_address = ?');
      params.push(options.ip_address);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`;
    const countResult = await db.get(countQuery, params);
    const total = countResult.total;
    
    // Get paginated results
    const query = `
      SELECT * FROM audit_logs 
      ${whereClause}
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `;
    
    const logs = await db.all(query, [...params, limit, offset]);
    
    return {
      logs,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  }

  // Get audit log summary statistics
  static async getStats(timeframe: string = '24h'): Promise<{
    total_events: number;
    by_severity: Record<string, number>;
    by_action: Record<string, number>;
    by_entity_type: Record<string, number>;
    unique_users: number;
    unique_ips: number;
  }> {
    const db = await getDatabase();
    
    let timeCondition = '';
    if (timeframe === '24h') {
      timeCondition = "WHERE timestamp >= datetime('now', '-1 day')";
    } else if (timeframe === '7d') {
      timeCondition = "WHERE timestamp >= datetime('now', '-7 days')";
    } else if (timeframe === '30d') {
      timeCondition = "WHERE timestamp >= datetime('now', '-30 days')";
    }
    
    // Get total events
    const totalResult = await db.get(`SELECT COUNT(*) as total FROM audit_logs ${timeCondition}`);
    
    // Get stats by severity
    const severityStats = await db.all(`
      SELECT severity, COUNT(*) as count 
      FROM audit_logs ${timeCondition}
      GROUP BY severity
    `);
    
    // Get stats by action
    const actionStats = await db.all(`
      SELECT action, COUNT(*) as count 
      FROM audit_logs ${timeCondition}
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `);
    
    // Get stats by entity type
    const entityStats = await db.all(`
      SELECT entity_type, COUNT(*) as count 
      FROM audit_logs ${timeCondition}
      GROUP BY entity_type
    `);
    
    // Get unique users and IPs
    const uniqueUsersResult = await db.get(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM audit_logs 
      ${timeCondition} AND user_id IS NOT NULL
    `);
    
    const uniqueIpsResult = await db.get(`
      SELECT COUNT(DISTINCT ip_address) as count 
      FROM audit_logs 
      ${timeCondition} AND ip_address IS NOT NULL
    `);
    
    return {
      total_events: totalResult.total,
      by_severity: Object.fromEntries(severityStats.map(s => [s.severity, s.count])),
      by_action: Object.fromEntries(actionStats.map(s => [s.action, s.count])),
      by_entity_type: Object.fromEntries(entityStats.map(s => [s.entity_type, s.count])),
      unique_users: uniqueUsersResult.count,
      unique_ips: uniqueIpsResult.count
    };
  }

  // Export audit logs (for compliance)
  static async exportLogs(options: {
    format: 'json' | 'csv';
    start_date?: string;
    end_date?: string;
    user_id?: number;
    entity_type?: string;
  }): Promise<string> {
    const db = await getDatabase();
    
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (options.start_date) {
      conditions.push('timestamp >= ?');
      params.push(options.start_date);
    }
    
    if (options.end_date) {
      conditions.push('timestamp <= ?');
      params.push(options.end_date);
    }
    
    if (options.user_id) {
      conditions.push('user_id = ?');
      params.push(options.user_id);
    }
    
    if (options.entity_type) {
      conditions.push('entity_type = ?');
      params.push(options.entity_type);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const logs = await db.all(`
      SELECT * FROM audit_logs 
      ${whereClause}
      ORDER BY timestamp DESC
    `, params);
    
    if (options.format === 'json') {
      return JSON.stringify(logs, null, 2);
    } else {
      // CSV format
      const headers = 'id,user_id,username,action,entity_type,entity_id,details,ip_address,user_agent,timestamp,severity\n';
      const rows = logs.map(log => 
        `${log.id},${log.user_id || ''},${log.username || ''},${log.action},${log.entity_type},${log.entity_id || ''},"${(log.details || '').replace(/"/g, '""')}",${log.ip_address || ''},${log.user_agent || ''},${log.timestamp},${log.severity}`
      ).join('\n');
      return headers + rows;
    }
  }

  // Clean up old audit logs (for storage management)
  static async cleanupOldLogs(days: number = 90): Promise<number> {
    const db = await getDatabase();
    
    try {
      const result = await db.run(`
        DELETE FROM audit_logs 
        WHERE timestamp < datetime('now', '-${days} days')
        AND severity != 'critical'
      `);
      
      console.log(`Cleaned up ${result.changes} audit log entries older than ${days} days`);
      return result.changes || 0;
    } catch (error) {
      console.error('Failed to cleanup audit logs:', error);
      throw error;
    }
  }

  // Security-focused audit functions
  static async logSecurityEvent(data: {
    user_id?: number;
    username?: string;
    event: string;
    details?: any;
    ip_address?: string;
    user_agent?: string;
    severity?: 'warning' | 'error' | 'critical';
  }): Promise<number> {
    return this.log({
      user_id: data.user_id,
      username: data.username,
      action: `security_${data.event}`,
      entity_type: 'system',
      details: data.details,
      ip_address: data.ip_address,
      user_agent: data.user_agent,
      severity: data.severity || 'warning'
    });
  }

  // Detect suspicious activities
  static async detectSuspiciousActivity(): Promise<{
    failed_logins: Array<{ ip_address: string; count: number; latest: string }>;
    high_volume_users: Array<{ user_id: number; username: string; message_count: number }>;
    unusual_access_patterns: Array<{ user_id: number; username: string; unique_ips: number }>;
  }> {
    const db = await getDatabase();
    
    // Failed login attempts in last hour
    const failedLogins = await db.all(`
      SELECT ip_address, COUNT(*) as count, MAX(timestamp) as latest
      FROM audit_logs 
      WHERE action = 'login_failed' 
      AND timestamp >= datetime('now', '-1 hour')
      GROUP BY ip_address
      HAVING count >= 5
      ORDER BY count DESC
    `);
    
    // High volume message senders in last hour
    const highVolumeUsers = await db.all(`
      SELECT user_id, username, COUNT(*) as message_count
      FROM audit_logs 
      WHERE action = 'message_send' 
      AND timestamp >= datetime('now', '-1 hour')
      GROUP BY user_id, username
      HAVING message_count >= 100
      ORDER BY message_count DESC
    `);
    
    // Users accessing from many different IPs today
    const unusualAccess = await db.all(`
      SELECT user_id, username, COUNT(DISTINCT ip_address) as unique_ips
      FROM audit_logs 
      WHERE action LIKE 'login_%' 
      AND timestamp >= datetime('now', '-1 day')
      AND user_id IS NOT NULL
      GROUP BY user_id, username
      HAVING unique_ips >= 5
      ORDER BY unique_ips DESC
    `);
    
    return {
      failed_logins: failedLogins,
      high_volume_users: highVolumeUsers,
      unusual_access_patterns: unusualAccess
    };
  }
}

// Convenience functions for common audit events
export const auditLog = {
  login: (user_id: number, username: string, ip_address?: string, user_agent?: string) =>
    AuditLogService.log({
      user_id, username, action: 'login_success', entity_type: 'session',
      ip_address, user_agent
    }),
    
  loginFailed: (username: string, ip_address?: string, user_agent?: string, reason?: string) =>
    AuditLogService.log({
      username, action: 'login_failed', entity_type: 'session',
      details: { reason }, ip_address, user_agent, severity: 'warning'
    }),
    
  logout: (user_id: number, username: string, ip_address?: string) =>
    AuditLogService.log({
      user_id, username, action: 'logout', entity_type: 'session', ip_address
    }),
    
  messageSent: (user_id: number, username: string, message_id: number, recipient_type: 'user' | 'group', recipient_id: number) =>
    AuditLogService.log({
      user_id, username, action: 'message_send', entity_type: 'message', entity_id: message_id,
      details: { recipient_type, recipient_id }
    }),
    
  messageDeleted: (user_id: number, username: string, message_id: number, deleted_by?: string) =>
    AuditLogService.log({
      user_id, username, action: 'message_delete', entity_type: 'message', entity_id: message_id,
      details: { deleted_by }
    }),
    
  userCreated: (admin_user_id: number, admin_username: string, created_user_id: number, created_username: string) =>
    AuditLogService.log({
      user_id: admin_user_id, username: admin_username, action: 'user_create', 
      entity_type: 'user', entity_id: created_user_id,
      details: { created_username }
    }),
    
  userUpdated: (admin_user_id: number, admin_username: string, updated_user_id: number, changes: any) =>
    AuditLogService.log({
      user_id: admin_user_id, username: admin_username, action: 'user_update',
      entity_type: 'user', entity_id: updated_user_id, details: changes
    }),
    
  userBanned: (admin_user_id: number, admin_username: string, banned_user_id: number, reason: string) =>
    AuditLogService.log({
      user_id: admin_user_id, username: admin_username, action: 'user_ban',
      entity_type: 'user', entity_id: banned_user_id,
      details: { reason }, severity: 'warning'
    }),
    
  groupCreated: (user_id: number, username: string, group_id: number, group_name: string) =>
    AuditLogService.log({
      user_id, username, action: 'group_create', entity_type: 'group', entity_id: group_id,
      details: { group_name }
    }),
    
  fileUploaded: (user_id: number, username: string, file_path: string, file_size: number) =>
    AuditLogService.log({
      user_id, username, action: 'file_upload', entity_type: 'file',
      details: { file_path, file_size }
    })
}; 