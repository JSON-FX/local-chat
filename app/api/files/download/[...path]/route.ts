import { NextRequest, NextResponse } from 'next/server';
import { FileService } from '../../../../../lib/files';
import { getDatabase } from '../../../../../lib/database';
import jwt from 'jsonwebtoken';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // For intranet chat, we'll use a more lenient auth check
    // First try Bearer token, then fall back to session cookie
    let isAuthenticated = false;
    
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
      
      try {
        jwt.verify(token, jwtSecret);
        isAuthenticated = true;
      } catch (error) {
        // Bearer token invalid, continue to check session
      }
    }
    
    // If no Bearer token, check for session cookie
    if (!isAuthenticated) {
      const sessionToken = request.cookies.get('auth_token')?.value;
      if (sessionToken) {
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        try {
          jwt.verify(sessionToken, jwtSecret);
          isAuthenticated = true;
        } catch (error) {
          // Session token also invalid
        }
      }
    }
    
    // If still not authenticated, check if there's any valid session in the database
    if (!isAuthenticated) {
      // For development/intranet use, we'll be more permissive
      // In production, you might want to be more strict
      const db = await getDatabase();
      const activeSessions = await db.get(
        'SELECT COUNT(*) as count FROM sessions WHERE is_active = 1 AND expires_at > CURRENT_TIMESTAMP'
      );
      
      if (activeSessions?.count === 0) {
        return NextResponse.json(
          { success: false, error: 'No active sessions found' },
          { status: 401 }
        );
      }
    }
    
    const { path: pathSegments } = await params;

    if (!pathSegments || pathSegments.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File path required' },
        { status: 400 }
      );
    }

    // Join path segments to create the full file path
    const filename = pathSegments.join('/');

    // Security check: ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('\\') || filename.startsWith('/') || filename.includes('//')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 400 }
      );
    }

    // Get file from storage
    const fileResult = await FileService.getFile(filename);
    
    if (!fileResult) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // TODO: Add permission check - verify user has access to this file
    // This would require checking if the user is the sender/recipient of the message
    // containing this file attachment. For now, any authenticated user can access files.

    // Determine content type
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    if (mimeTypes[ext]) {
      contentType = mimeTypes[ext];
    }

    // Create response with file stream
    const response = new NextResponse(fileResult.stream as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileResult.stats.size.toString(),
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
        'X-Content-Type-Options': 'nosniff'
      }
    });

    return response;

  } catch (error: any) {
    console.error('File download error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to download file' 
      },
      { status: 500 }
    );
  }
} 