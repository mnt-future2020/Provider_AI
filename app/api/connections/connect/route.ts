import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { initiateConnection } from '@/lib/composio';

export async function POST(req: Request) {
  try {
    const user = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { toolkit } = await req.json();
    console.log('Connecting toolkit:', toolkit, 'for user:', user.id);

    if (!toolkit) {
      return NextResponse.json(
        { error: 'Toolkit is required' },
        { status: 400 }
      );
    }

    const result = await initiateConnection(user.id, toolkit);
    console.log('Connection result:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error connecting toolkit:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to connect toolkit' },
      { status: 500 }
    );
  }
}
