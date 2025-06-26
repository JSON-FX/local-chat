import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { SystemMetricsService } from '@/lib/systemMetrics';
import { AuditLogService } from '@/lib/auditLog';

// GET /api/admin - Admin dashboard overview
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(['admin'])(request);
    
    // Get system metrics and stats
    const [
      systemStatus,
      aggregatedMetrics,
      auditStats,
      recentActivity
    ] = await Promise.all([
      SystemMetricsService.getSystemStatus(),
      SystemMetricsService.getAggregatedMetrics('24h'),
      AuditLogService.getStats('24h'),
      AuditLogService.getLogs({ limit: 10, page: 1 })
    ]);

    // Get suspicious activity detection
    const suspiciousActivity = await AuditLogService.detectSuspiciousActivity();
    
    return NextResponse.json({
      success: true,
      data: {
        system_status: systemStatus,
        metrics: aggregatedMetrics,
        audit_stats: auditStats,
        recent_activity: recentActivity.logs,
        security_alerts: {
          failed_logins: suspiciousActivity.failed_logins.length,
          high_volume_users: suspiciousActivity.high_volume_users.length,
          unusual_access: suspiciousActivity.unusual_access_patterns.length
        }
      }
    });
    
  } catch (error: any) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get admin dashboard data' },
      { status: error.status || 500 }
    );
  }
} 