'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
  PanelLeftClose, 
  SquarePen, 
  Zap,
  LogOut,
  Check,
  ExternalLink,
  Plus,
  Settings,
  ChevronUp
} from 'lucide-react';

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

// Grouped toolkits by category
const TOOLKIT_CATEGORIES = [
  {
    name: 'Google Workspace',
    toolkits: [
      { id: 'gmail', name: 'Gmail', description: 'Read, send, and manage emails.' },
      { id: 'googlecalendar', name: 'Google Calendar', description: 'Manage events and meetings.' },
      { id: 'googledrive', name: 'Google Drive', description: 'Store and access files.' },
      { id: 'googlesheets', name: 'Google Sheets', description: 'Spreadsheets and data analysis.' },
      { id: 'googledocs', name: 'Google Docs', description: 'Create and edit documents.' },
      { id: 'googleslides', name: 'Google Slides', description: 'Create presentations.' },
      { id: 'googlemeet', name: 'Google Meet', description: 'Video conferencing.' },
      { id: 'googletasks', name: 'Google Tasks', description: 'Manage to-do lists.' },
      { id: 'googleforms', name: 'Google Forms', description: 'Create surveys and forms.' },
    ]
  },
  {
    name: 'Productivity',
    toolkits: [
      { id: 'notion', name: 'Notion', description: 'Notes, docs, and databases.' },
      { id: 'slack', name: 'Slack', description: 'Team messaging and collaboration.' },
      { id: 'trello', name: 'Trello', description: 'Project management boards.' },
      { id: 'asana', name: 'Asana', description: 'Task and project management.' },
    ]
  },
  {
    name: 'Developer Tools',
    toolkits: [
      { id: 'github', name: 'GitHub', description: 'Code repositories and issues.' },
      { id: 'linear', name: 'Linear', description: 'Issue tracking for teams.' },
      { id: 'jira', name: 'Jira', description: 'Agile project management.' },
    ]
  },
  {
    name: 'Communication',
    toolkits: [
      { id: 'whatsapp', name: 'WhatsApp', description: 'Send messages and media.' },
      { id: 'discord', name: 'Discord', description: 'Community messaging.' },
      { id: 'twitter', name: 'Twitter', description: 'Social media posts.' },
    ]
  }
];

// Get logo URL from Composio CDN
const getToolkitLogo = (toolkitId: string) => {
  return `https://logos.composio.dev/api/${toolkitId}`;
};

export default function ConnectionsPage() {
  const { data: session, status } = useSession();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

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
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex' }}>
      {/* Sidebar */}
      <div style={{ 
        width: sidebarOpen ? '280px' : '60px', 
        background: '#ffffff', 
        borderRight: '1px solid #e5e5e5',
        transition: 'width 0.3s',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 20
      }}>
        {/* Logo Header */}
        <div style={{ 
          padding: sidebarOpen ? '16px 20px' : '16px 0',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: sidebarOpen ? 'space-between' : 'center'
        }}>
          {sidebarOpen ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  width: '28px', 
                  height: '28px', 
                  background: '#2196F3', 
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{ color: '#fff', fontSize: '12px', fontWeight: '700' }}>iS</span>
                </div>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a' }}>iSuiteAI</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                style={{ 
                  background: 'none', 
                  border: '1px solid #e5e5e5', 
                  borderRadius: '6px',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <PanelLeftClose size={16} color="#666" />
              </button>
            </>
          ) : (
            <div style={{ 
              width: '28px', 
              height: '28px', 
              background: '#2196F3', 
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }} onClick={() => setSidebarOpen(true)}>
              <span style={{ color: '#fff', fontSize: '12px', fontWeight: '700' }}>iS</span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <div style={{ padding: sidebarOpen ? '8px 12px' : '8px 0', display: 'flex', flexDirection: 'column', alignItems: sidebarOpen ? 'stretch' : 'center' }}>
          {/* New Chat */}
          <div
            onClick={() => router.push('/')}
            title="New chat"
            style={{
              padding: sidebarOpen ? '10px 12px' : '10px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              gap: '12px',
              fontSize: '14px',
              color: '#1a1a1a',
              border: '1px solid #e5e5e5',
              marginBottom: '8px',
              background: '#ffffff',
              width: sidebarOpen ? 'auto' : '40px',
              height: sidebarOpen ? 'auto' : '40px'
            }}
          >
            <SquarePen size={18} color="#1a1a1a" />
            {sidebarOpen && 'New chat'}
          </div>

          {/* Apps - Active */}
          <div
            title="Apps"
            style={{
              padding: sidebarOpen ? '10px 12px' : '10px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              gap: '12px',
              fontSize: '14px',
              color: '#1a1a1a',
              marginBottom: '4px',
              background: '#f3f4f6',
              width: sidebarOpen ? 'auto' : '40px',
              height: sidebarOpen ? 'auto' : '40px'
            }}
          >
            <Zap size={18} color="#1a1a1a" />
            {sidebarOpen && 'Apps'}
          </div>
        </div>

        {/* Bottom Section - User Profile with Dropdown */}
        <div style={{ 
          marginTop: 'auto', 
          borderTop: '1px solid #e5e5e5',
          padding: sidebarOpen ? '12px' : '12px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: sidebarOpen ? 'stretch' : 'center',
          position: 'relative'
        }}>
          {/* Dropdown Menu */}
          {userMenuOpen && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: sidebarOpen ? '12px' : '50%',
              transform: sidebarOpen ? 'none' : 'translateX(-50%)',
              background: '#ffffff',
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              marginBottom: '8px',
              minWidth: sidebarOpen ? 'calc(100% - 24px)' : '160px',
              zIndex: 50,
              overflow: 'hidden'
            }}>
              {/* Settings */}
              <div
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '14px',
                  color: '#1a1a1a',
                  borderBottom: '1px solid #f0f0f0'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
              >
                <Settings size={16} color="#666" />
                Settings
              </div>

              {/* Log Out */}
              <div
                onClick={handleLogout}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '14px',
                  color: '#1a1a1a'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
              >
                <LogOut size={16} color="#666" />
                Log Out
              </div>
            </div>
          )}

          {/* User Profile Button */}
          {sidebarOpen ? (
            <div 
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{
                padding: '12px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: userMenuOpen ? '#f3f4f6' : '#f9fafb',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#2196F3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {session?.user?.name || 'User'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>
                    {session?.user?.email || ''}
                  </div>
                </div>
              </div>
              <ChevronUp size={16} color="#666" style={{ transform: userMenuOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
            </div>
          ) : (
            <div 
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              title={session?.user?.name || 'User'}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#2196F3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ 
        flex: 1, 
        marginLeft: sidebarOpen ? '280px' : '60px', 
        transition: 'margin-left 0.3s',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <header style={{ borderBottom: '1px solid #e5e5e5', background: '#ffffff', position: 'sticky', top: 0, zIndex: 10, minHeight: '57px' }}>
          <div style={{ padding: '16px 24px' }}>
            {/* Empty header - logout moved to sidebar */}
          </div>
        </header>

        <main style={{ flex: 1, padding: '40px 24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Page Title */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            Integrations
          </h2>
          <p style={{ fontSize: '15px', color: '#666' }}>
            Connect your favorite tools to supercharge your Workflow Agents.
          </p>
        </div>

        {/* Categories */}
        {TOOLKIT_CATEGORIES.map((category) => {
          const connectedCount = category.toolkits.filter(t => isConnected(t.id)).length;
          
          return (
            <div key={category.name} style={{ marginBottom: '40px' }}>
              {/* Category Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>
                  {category.name}
                </h3>
                <span style={{
                  background: '#f1f5f9',
                  color: '#64748b',
                  fontSize: '12px',
                  fontWeight: '500',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}>
                  {connectedCount}
                </span>
              </div>

              {/* Toolkit Cards Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: '16px' 
              }}>
                {category.toolkits.map((toolkit) => {
                  const connected = isConnected(toolkit.id);
                  const connection = connections.find(c => {
                    const connToolkit = c.toolkit?.slug || c.integrationId || '';
                    return connToolkit.toLowerCase() === toolkit.id.toLowerCase();
                  });

                  return (
                    <div
                      key={toolkit.id}
                      style={{
                        padding: '24px',
                        background: '#ffffff',
                        border: '1px solid #e5e5e5',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        position: 'relative'
                      }}
                    >
                      {/* Active Badge */}
                      {connected && (
                        <div style={{
                          position: 'absolute',
                          top: '16px',
                          right: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          color: '#10b981',
                          fontWeight: '500'
                        }}>
                          <Check size={14} />
                          Active
                        </div>
                      )}

                      {/* Logo */}
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '10px',
                        background: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}>
                        <img 
                          src={getToolkitLogo(toolkit.id)} 
                          alt={toolkit.name}
                          style={{ width: '28px', height: '28px', objectFit: 'contain' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>

                      {/* Name & Description */}
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a', marginBottom: '4px', margin: 0 }}>
                          {toolkit.name}
                        </h4>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                          {toolkit.description}
                        </p>
                      </div>

                      {/* Buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                        {connected ? (
                          <>
                            <button
                              onClick={() => connection && handleDisconnect(connection.id)}
                              style={{
                                padding: '10px 16px',
                                background: '#fff',
                                border: '1px solid #fca5a5',
                                borderRadius: '8px',
                                fontSize: '13px',
                                color: '#ef4444',
                                cursor: 'pointer',
                                fontWeight: '500',
                                width: '100%'
                              }}
                            >
                              Disconnect
                            </button>
                            <button
                              onClick={() => handleConnect(toolkit.id)}
                              style={{
                                padding: '10px 16px',
                                background: 'transparent',
                                border: '1px solid #e5e5e5',
                                borderRadius: '8px',
                                fontSize: '13px',
                                color: '#64748b',
                                cursor: 'pointer',
                                fontWeight: '500',
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}
                            >
                              Re-Connect <ExternalLink size={12} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleConnect(toolkit.id)}
                            disabled={connecting === toolkit.id}
                            style={{
                              padding: '10px 16px',
                              background: connecting === toolkit.id ? '#e5e5e5' : '#0ea5e9',
                              color: connecting === toolkit.id ? '#999' : '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '13px',
                              cursor: connecting === toolkit.id ? 'not-allowed' : 'pointer',
                              fontWeight: '500',
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            {connecting === toolkit.id ? 'Connecting...' : 'Connect'} 
                            {connecting !== toolkit.id && <Plus size={14} />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        </main>
      </div>
    </div>
  );
}
