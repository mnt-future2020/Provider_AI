// This file is no longer needed - NextAuth handles login via /api/auth/signin
// Keeping for backwards compatibility, but redirects to NextAuth
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Please use /api/auth/signin for authentication' },
    { status: 410 }
  );
}
