import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    // Check if user is authenticated (optional: add admin check)
    const user = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch all connected accounts from Composio
    const response = await fetch('https://backend.composio.dev/api/v3/connected_accounts', {
      method: 'GET',
      headers: {
        'x-api-key': process.env.COMPOSIO_API_KEY || '',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Failed to fetch users' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Group connections by user ID
    const userMap = new Map();
    
    data.items?.forEach((connection: any) => {
      const userId = connection.user_id || connection.userId || 'unknown';
      
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId: userId,
          connections: [],
          totalConnections: 0,
        });
      }
      
      const userData = userMap.get(userId);
      userData.connections.push({
        id: connection.id,
        toolkit: connection.toolkit?.slug || connection.toolkit?.name || 'unknown',
        status: connection.status,
        createdAt: connection.created_at || connection.createdAt,
      });
      userData.totalConnections++;
    });

    // Convert map to array
    const users = Array.from(userMap.values());

    return NextResponse.json({
      success: true,
      totalUsers: users.length,
      users: users,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}