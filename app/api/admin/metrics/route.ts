import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { SystemMetricsService } from '@/lib/systemMetrics';
import { auditLog } from '@/lib/auditLog';

// GET /api/admin/metrics - Get system metrics and performance data
export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireRole(['admin'])(request);
    const { searchParams } = new URL(request.url);
    
    const timeframe = searchParams.get('timeframe') || '24h';
    const metric_name = searchParams.get('metric_name');
    const metric_type = searchParams.get('metric_type');
    const format = searchParams.get('format') || 'summary'; // summary, detailed, timeseries
    
    let responseData: any = {};
    
    if (format === 'summary') {
      // Get aggregated metrics summary
      responseData = await SystemMetricsService.getAggregatedMetrics(timeframe);
      
    } else if (format === 'detailed') {
      // Get detailed metrics with filtering
      const options: any = {};
      if (metric_name) options.metric_name = metric_name;
      if (metric_type) options.metric_type = metric_type;
      if (timeframe === '24h') {
        options.start_time = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      } else if (timeframe === '7d') {
        options.start_time = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (timeframe === '30d') {
        options.start_time = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }
      
      responseData.metrics = await SystemMetricsService.getMetrics(options);
      
    } else if (format === 'timeseries') {
      // Get time-series data for charts
      if (!metric_name) {
        return NextResponse.json(
          { success: false, error: 'metric_name is required for timeseries format' },
          { status: 400 }
        );
      }
      
      const interval = searchParams.get('interval') || '1h';
      responseData = await SystemMetricsService.getTimeSeries(metric_name, timeframe, interval);
    }
    
    // Log admin action
    await auditLog.userUpdated(adminUser.id, adminUser.username, 0, { 
      action: 'metrics_viewed',
      format, timeframe, metric_name, metric_type
    });
    
    return NextResponse.json({
      success: true,
      data: responseData
    });
    
  } catch (error: any) {
    console.error('Admin metrics error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get metrics' },
      { status: error.status || 500 }
    );
  }
}

// POST /api/admin/metrics/collect - Manually trigger metrics collection
export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireRole(['admin'])(request);
    
    // Manually trigger metrics collection
    await SystemMetricsService.collectSystemMetrics();
    
    // Log admin action
    await auditLog.userUpdated(adminUser.id, adminUser.username, 0, { 
      action: 'metrics_collection_triggered'
    });
    
    return NextResponse.json({
      success: true,
      message: 'Metrics collection triggered successfully'
    });
    
  } catch (error: any) {
    console.error('Admin metrics collection error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to collect metrics' },
      { status: error.status || 500 }
    );
  }
} 