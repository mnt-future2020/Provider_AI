import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function DELETE(request: Request) {
  try {
    // Check if user is authenticated
    const user = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch all connections
    const connectionsResponse = await fetch(
      'https://backend.composio.dev/api/v3/connected_accounts',
      {
        method: 'GET',
        headers: {
          'x-api-key': process.env.COMPOSIO_API_KEY || '',
        },
      }
    );

    if (!connectionsResponse.ok) {
      const errorData = await connectionsResponse.json();
      return NextResponse.json(
        { error: errorData.message || 'Failed to fetch user connections' },
        { status: connectionsResponse.status }
      );
    }

    const connectionsData = await connectionsResponse.json();
    const allConnections = connectionsData.items || [];
    
    // Filter connections for this specific user only
    const connections = allConnections.filter((connection: any) => {
      const connUserId = connection.user_id || connection.userId;
      return connUserId === userId;
    });

    console.log(`Found ${connections.length} connections for user ${userId} out of ${allConnections.length} total connections`);

    // Delete all connections for this user
    if (connections.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No connections found for user ${userId}`,
        deletedConnections: 0,
      });
    }

    const deletePromises = connections.map((connection: any) =>
      fetch(`https://backend.composio.dev/api/v3/connected_accounts/${connection.id}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': process.env.COMPOSIO_API_KEY || '',
        },
      })
    );

    const results = await Promise.all(deletePromises);
    
    // Check if all deletions were successful
    const successCount = results.filter(r => r.ok).length;

    return NextResponse.json({
      success: true,
      message: `Successfully deleted user ${userId} and ${successCount} connection(s)`,
      deletedConnections: successCount,
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
