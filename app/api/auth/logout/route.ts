// This file is no longer needed - NextAuth handles logout via signOut()
// Keeping for backwards compatibility
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Please use signOut() from next-auth/react for logout' },
    { status: 410 }
  );
}
