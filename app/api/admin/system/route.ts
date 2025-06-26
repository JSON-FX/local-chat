import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { SystemMetricsService } from '@/lib/systemMetrics';
import { AuditLogService } from '@/lib/auditLog';
import { auditLog } from '@/lib/auditLog';

// GET /api/admin/system - Get real-time system health status
export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireRole(['admin'])(request);
    
    // Get comprehensive system status
    const [
      systemStatus,
      suspiciousActivity,
      auditStats,
      aggregatedMetrics
    ] = await Promise.all([
      SystemMetricsService.getSystemStatus(),
      AuditLogService.detectSuspiciousActivity(),
      AuditLogService.getStats('24h'),
      SystemMetricsService.getAggregatedMetrics('24h')
    ]);
    
    // Calculate overall health score
    let healthScore = 100;
    
    if (systemStatus.status === 'warning') healthScore -= 20;
    if (systemStatus.status === 'critical') healthScore -= 50;
    
    if (suspiciousActivity.failed_logins.length > 0) healthScore -= 10;
    if (suspiciousActivity.high_volume_users.length > 0) healthScore -= 15;
    if (suspiciousActivity.unusual_access_patterns.length > 0) healthScore -= 20;
    
    // Prepare alerts
    const alerts: any[] = [];
    
    // System alerts
    if (systemStatus.issues.length > 0) {
      alerts.push({
        type: 'system',
        severity: systemStatus.status,
        title: 'System Performance Issues',
        details: systemStatus.issues,
        timestamp: new Date().toISOString()
      });
    }
    
    // Security alerts
    if (suspiciousActivity.failed_logins.length > 0) {
      alerts.push({
        type: 'security',
        severity: 'warning',
        title: 'High Failed Login Attempts',
        details: suspiciousActivity.failed_logins.map(fl => 
          `${fl.count} attempts from ${fl.ip_address} (latest: ${fl.latest})`
        ),
        timestamp: new Date().toISOString()
      });
    }
    
    if (suspiciousActivity.high_volume_users.length > 0) {
      alerts.push({
        type: 'security',
        severity: 'warning',
        title: 'High Volume Message Activity',
        details: suspiciousActivity.high_volume_users.map(hvu => 
          `${hvu.username}: ${hvu.message_count} messages in last hour`
        ),
        timestamp: new Date().toISOString()
      });
    }
    
    if (suspiciousActivity.unusual_access_patterns.length > 0) {
      alerts.push({
        type: 'security',
        severity: 'critical',
        title: 'Unusual Access Patterns Detected',
        details: suspiciousActivity.unusual_access_patterns.map(uap => 
          `${uap.username}: ${uap.unique_ips} different IP addresses today`
        ),
        timestamp: new Date().toISOString()
      });
    }
    
    // Log admin action
    await auditLog.userUpdated(adminUser.id, adminUser.username, 0, { 
      action: 'system_status_viewed',
      health_score: healthScore,
      alerts_count: alerts.length
    });
    
    return NextResponse.json({
      success: true,
      data: {
        health_score: Math.max(0, healthScore),
        status: systemStatus.status,
        system_metrics: aggregatedMetrics,
        system_status: systemStatus,
        security_summary: {
          failed_logins_24h: auditStats.by_action['login_failed'] || 0,
          total_events_24h: auditStats.total_events,
          unique_users_24h: auditStats.unique_users,
          unique_ips_24h: auditStats.unique_ips
        },
        suspicious_activity: suspiciousActivity,
        alerts,
        last_updated: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    console.error('Admin system status error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get system status' },
      { status: error.status || 500 }
    );
  }
}

// POST /api/admin/system/maintenance - Perform maintenance operations
export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireRole(['admin'])(request);
    const body = await request.json();
    
    const { operation, parameters = {} } = body;
    
    let result: any = {};
    
    switch (operation) {
      case 'cleanup_audit_logs':
        const auditDays = parameters.days || 90;
        const auditCleaned = await AuditLogService.cleanupOldLogs(auditDays);
        result = { operation, cleaned_records: auditCleaned, days: auditDays };
        break;
        
      case 'cleanup_metrics':
        const metricsDays = parameters.days || 30;
        const metricsCleaned = await SystemMetricsService.cleanupOldMetrics(metricsDays);
        result = { operation, cleaned_records: metricsCleaned, days: metricsDays };
        break;
        
      case 'collect_metrics':
        await SystemMetricsService.collectSystemMetrics();
        result = { operation, message: 'Metrics collection completed' };
        break;
        
      case 'cleanup_expired_sessions':
        const { AuthService } = await import('@/lib/auth');
        await AuthService.cleanupExpiredSessions();
        result = { operation, message: 'Expired sessions cleaned up' };
        break;
        
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid maintenance operation' },
          { status: 400 }
        );
    }
    
    // Log maintenance action
    await auditLog.userUpdated(adminUser.id, adminUser.username, 0, { 
      action: 'maintenance_performed',
      operation,
      parameters,
      result
    });
    
    return NextResponse.json({
      success: true,
      data: result,
      message: `Maintenance operation '${operation}' completed successfully`
    });
    
  } catch (error: any) {
    console.error('Admin maintenance error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to perform maintenance operation' },
      { status: error.status || 500 }
    );
  }
} 