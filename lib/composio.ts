import { Composio } from '@composio/core';
import { VercelProvider } from '@composio/vercel';

// Initialize Composio client
export function getComposioClient() {
  return new Composio({
    provider: new VercelProvider(),
    apiKey: process.env.COMPOSIO_API_KEY,
  });
}

// Get user's connected accounts
export async function getUserConnections(userId: string) {
  const composio = getComposioClient();
  
  try {
    const accounts = await composio.connectedAccounts.list({
      userIds: [userId],
    });
    return accounts.items || [];
  } catch (error) {
    console.error('Error fetching connections:', error);
    return [];
  }
}

// Initiate connection for a toolkit using Tool Router
export async function initiateConnection(userId: string, toolkit: string) {
  const composio = getComposioClient();
  
  try {
    console.log('Creating session for user:', userId);
    
    // Create a session for the user
    const session = await composio.create(userId);
    
    console.log('Authorizing toolkit:', toolkit);
    
    // Authorize the toolkit - this generates the OAuth link
    const connectionRequest = await session.authorize(toolkit);
    
    console.log('Connection request:', connectionRequest);

    return {
      success: true,
      redirectUrl: connectionRequest.redirectUrl,
      connectionId: connectionRequest.id,
    };
  } catch (error: any) {
    console.error('Error initiating connection:', error);
    return {
      success: false,
      error: error.message || 'Failed to initiate connection',
    };
  }
}

// Delete a connected account
export async function deleteConnection(connectionId: string) {
  const composio = getComposioClient();
  
  try {
    await composio.connectedAccounts.delete(connectionId);
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting connection:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete connection',
    };
  }
}

// Get connection status
export async function getConnectionStatus(connectionId: string) {
  const composio = getComposioClient();
  
  try {
    const account = await composio.connectedAccounts.get(connectionId);
    return account;
  } catch (error) {
    console.error('Error getting connection status:', error);
    return null;
  }
}
