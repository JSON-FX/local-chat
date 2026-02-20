import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'Password management is handled by LGU-SSO. Please visit the SSO portal to change your password.'
    },
    { status: 410 }
  );
}
