import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { deleteConnection } from '@/lib/composio';

export async function POST(req: Request) {
  try {
    const user = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { connectionId } = await req.json();

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    const result = await deleteConnection(connectionId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error disconnecting:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
