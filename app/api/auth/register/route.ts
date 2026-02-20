import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'Self-registration is no longer available. Please use LGU-SSO to sign in.'
    },
    { status: 410 }
  );
}
