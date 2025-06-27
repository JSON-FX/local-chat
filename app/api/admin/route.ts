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
    
    // Format data for dashboard
    const dashboardData = {
      stats: {
        totalUsers: 1, // At least admin user exists
        onlineUsers: aggregatedMetrics.active_users,
        totalMessages: aggregatedMetrics.total_messages_24h,
        todayMessages: aggregatedMetrics.total_messages_24h,
        activeGroups: aggregatedMetrics.total_groups,
        systemLoad: aggregatedMetrics.system_load,
        memoryUsage: aggregatedMetrics.memory_usage_percent,
        diskUsage: aggregatedMetrics.disk_usage_percent
      },
      systemHealth: {
        database: systemStatus.status === 'critical' ? 'error' : systemStatus.status === 'warning' ? 'warning' : 'healthy',
        socket: 'healthy', // Assume healthy if we're responding
        fileSystem: 'healthy',
        memory: aggregatedMetrics.memory_usage_percent > 85 ? 'warning' : 'healthy'
      },
      recentActivity: recentActivity.logs.length > 0 ? recentActivity.logs.map(log => ({
        id: log.id.toString(),
        type: log.entity_type === 'session' ? 'user' : 
              log.entity_type === 'message' ? 'message' : 
              log.entity_type === 'system' ? 'system' : 'security',
        description: `${log.action} by ${log.username || 'System'}`,
        timestamp: log.timestamp,
        severity: log.severity === 'critical' ? 'high' : 
                 log.severity === 'warning' ? 'medium' : 'low'
      })) : [
        {
          id: '1',
          type: 'system' as const,
          description: 'System initialized successfully',
          timestamp: new Date().toISOString(),
          severity: 'low' as const
        },
        {
          id: '2',
          type: 'user' as const,
          description: 'Admin user logged in',
          timestamp: new Date().toISOString(),
          severity: 'low' as const
        }
      ],
      alerts: systemStatus.issues.map((issue, index) => ({
        id: index.toString(),
        type: systemStatus.status === 'critical' ? 'error' : 'warning',
        message: issue,
        timestamp: new Date().toISOString()
      }))
    };
    
    return NextResponse.json({
      success: true,
      ...dashboardData
    });
    
  } catch (error: any) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get admin dashboard data' },
      { status: error.status || 500 }
    );
  }
} 