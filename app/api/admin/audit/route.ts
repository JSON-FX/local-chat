import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { AuditLogService } from '@/lib/auditLog';

// GET /api/admin/audit - Get audit logs with filtering
export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireRole(['admin'])(request);
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const user_id = searchParams.get('user_id');
    const username = searchParams.get('username');
    const action = searchParams.get('action');
    const entity_type = searchParams.get('entity_type');
    const entity_id = searchParams.get('entity_id');
    const severity = searchParams.get('severity');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const ip_address = searchParams.get('ip_address');
    
    // Build options object
    const options: any = {
      page,
      limit
    };
    
    if (user_id) options.user_id = parseInt(user_id);
    if (username) options.username = username;
    if (action) options.action = action;
    if (entity_type) options.entity_type = entity_type;
    if (entity_id) options.entity_id = parseInt(entity_id);
    if (severity) options.severity = severity;
    if (start_date) options.start_date = start_date;
    if (end_date) options.end_date = end_date;
    if (ip_address) options.ip_address = ip_address;
    
    // Get audit logs
    const result = await AuditLogService.getLogs(options);
    
    // Log admin action (viewing audit logs)
    await AuditLogService.log({
      user_id: adminUser.id,
      username: adminUser.username,
      action: 'audit_logs_viewed',
      entity_type: 'system',
      details: { filters: options, result_count: result.logs.length }
    });
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error: any) {
    console.error('Admin audit logs error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get audit logs' },
      { status: error.status || 500 }
    );
  }
}

// POST /api/admin/audit/export - Export audit logs
export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireRole(['admin'])(request);
    const body = await request.json();
    
    const { 
      format = 'json', 
      start_date, 
      end_date, 
      user_id, 
      entity_type 
    } = body;
    
    if (!['json', 'csv'].includes(format)) {
      return NextResponse.json(
        { success: false, error: 'Format must be json or csv' },
        { status: 400 }
      );
    }
    
    // Export audit logs
    const exportData = await AuditLogService.exportLogs({
      format: format as 'json' | 'csv',
      start_date,
      end_date,
      user_id: user_id ? parseInt(user_id) : undefined,
      entity_type
    });
    
    // Log export action
    await AuditLogService.log({
      user_id: adminUser.id,
      username: adminUser.username,
      action: 'audit_logs_exported',
      entity_type: 'system',
      details: { format, start_date, end_date, user_id, entity_type },
      severity: 'warning' // Export is a sensitive action
    });
    
    // Set appropriate headers for download
    const headers = new Headers();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `audit_logs_${timestamp}.${format}`;
    
    headers.set('Content-Type', format === 'json' ? 'application/json' : 'text/csv');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    
    return new NextResponse(exportData, {
      status: 200,
      headers
    });
    
  } catch (error: any) {
    console.error('Admin audit export error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to export audit logs' },
      { status: error.status || 500 }
    );
  }
} 