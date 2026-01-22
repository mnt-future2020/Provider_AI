'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Connection {
  id: string;
  integrationId?: string;
  toolkit?: {
    slug: string;
    name: string;
  };
  status: string;
  createdAt: string;
}

const AVAILABLE_TOOLKITS = [
  { id: 'github', name: 'GitHub', description: 'Manage repositories and issues' },
  { id: 'gmail', name: 'Gmail', description: 'Send and manage emails' },
  { id: 'slack', name: 'Slack', description: 'Send messages and manage channels' },
  { id: 'notion', name: 'Notion', description: 'Manage pages and databases' },
  { id: 'googlecalendar', name: 'Google Calendar', description: 'Manage events and schedules' },
  { id: 'googledocs', name: 'Google Docs', description: 'Create and edit documents' },
  { id: 'whatsapp', name: 'WhatsApp', description: 'Send messages and manage chats' },
];

export default function ConnectionsPage() {
  const { data: session, status } = useSession();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchConnections();
    }
  }, [status, router]);

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/connections');
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      const data = await response.json();
      console.log('Connections data:', data.connections);
      setConnections(data.connections || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (toolkit: string) => {
    setConnecting(toolkit);
    try {
      const response = await fetch('/api/connections/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolkit }),
      });

      const data = await response.json();
      console.log('Connect response:', data);

      if (data.success && data.redirectUrl) {
        const popup = window.open(data.redirectUrl, '_blank', 'width=600,height=700');
        
        if (!popup) {
          alert('Please allow popups for this site to connect apps');
        } else {
          const pollInterval = setInterval(() => {
            fetchConnections();
          }, 2000);

          setTimeout(() => {
            clearInterval(pollInterval);
          }, 30000);

          setTimeout(() => {
            fetchConnections();
          }, 3000);
        }
      } else {
        alert(`Failed to connect: ${data.error || 'Unknown error'}`);
        console.error('Connection failed:', data);
      }
    } catch (error) {
      console.error('Error connecting:', error);
      alert('Failed to connect. Please try again.');
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this app?')) return;

    try {
      await fetch('/api/connections/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });

      fetchConnections();
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const isConnected = (toolkitId: string) => {
    return connections.some(conn => {
      const connToolkit = conn.toolkit?.slug || conn.integrationId || '';
      const isMatch = connToolkit.toLowerCase() === toolkitId.toLowerCase();
      const isActive = conn.status === 'ACTIVE';
      return isMatch && isActive;
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
        <div style={{ fontSize: '14px', color: '#666' }}>Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>
      <header style={{ borderBottom: '1px solid #e5e5e5', background: '#ffffff' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em' }}>
            iSuiteAI
          </h1>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '8px 16px',
              background: '#ffffff',
              border: '1px solid #e5e5e5',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#1a1a1a',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Back to Chat
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#1a1a1a', marginBottom: '8px', letterSpacing: '-0.01em' }}>
            Connections
          </h2>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Connect your apps to enable automation and AI-powered workflows
          </p>
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          {AVAILABLE_TOOLKITS.map((toolkit) => {
            const connected = isConnected(toolkit.id);
            const connection = connections.find(c => {
              const connToolkit = c.toolkit?.slug || c.integrationId || '';
              return connToolkit.toLowerCase() === toolkit.id.toLowerCase();
            });

            return (
              <div
                key={toolkit.id}
                style={{
                  padding: '20px',
                  background: '#ffffff',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', marginBottom: '4px' }}>
                    {toolkit.name}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                    {toolkit.description}
                  </p>
                  {connected && (
                    <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#16a34a' }}>
                      <div style={{ width: '6px', height: '6px', background: '#16a34a', borderRadius: '50%' }}></div>
                      Connected
                    </div>
                  )}
                </div>

                {connected ? (
                  <button
                    onClick={() => connection && handleDisconnect(connection.id)}
                    style={{
                      padding: '8px 16px',
                      background: '#ffffff',
                      border: '1px solid #e5e5e5',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#dc2626',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(toolkit.id)}
                    disabled={connecting === toolkit.id}
                    style={{
                      padding: '8px 16px',
                      background: connecting === toolkit.id ? '#f5f5f5' : '#1a1a1a',
                      color: connecting === toolkit.id ? '#999' : '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: connecting === toolkit.id ? 'not-allowed' : 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    {connecting === toolkit.id ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
