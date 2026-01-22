import { NextResponse } from 'next/server';
import { createSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Create user session
    // In production, validate credentials against your database
    const user = {
      id: email, // Using email as ID for simplicity
      email,
      name,
    };

    await createSession(user);

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}
