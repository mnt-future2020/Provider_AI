'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UserConnection {
  id: string;
  toolkit: string;
  status: string;
  createdAt: string;
}

interface User {
  userId: string;
  connections: UserConnection[];
  totalConnections: number;
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      
      if (response.status === 401) {
        router.push('/login');
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users || []);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(`Are you sure you want to delete user "${userId}" and all their connections? This action cannot be undone.`)) {
      return;
    }

    setDeleting(userId);
    try {
      const response = await fetch('/api/admin/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Successfully deleted user and ${data.deletedConnections} connection(s)`);
        fetchUsers(); // Refresh the list
      } else {
        alert(`Failed to delete user: ${data.error}`);
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
        <div style={{ fontSize: '14px', color: '#666' }}>Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
        <div style={{ maxWidth: '500px', padding: '20px', background: '#fff3f3', border: '1px solid #fecaca', borderRadius: '8px' }}>
          <div style={{ fontWeight: '600', marginBottom: '8px', color: '#991b1b' }}>Error</div>
          <div style={{ fontSize: '14px', color: '#dc2626' }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid #e5e5e5', background: '#ffffff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em' }}>
            iSuiteAI - Admin Dashboard
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

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#1a1a1a', marginBottom: '8px', letterSpacing: '-0.01em' }}>
            Connected Users
          </h2>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Total users: {users.length} | Total connections: {users.reduce((sum, u) => sum + u.totalConnections, 0)}
          </p>
        </div>

        {users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
            <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>No users yet</div>
            <div style={{ fontSize: '14px' }}>Users will appear here once they connect apps</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {users.map((user) => (
              <div
                key={user.userId}
                style={{
                  padding: '24px',
                  background: '#ffffff',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a', marginBottom: '4px' }}>
                      {user.userId}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                      {user.totalConnections} connection{user.totalConnections !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteUser(user.userId)}
                    disabled={deleting === user.userId}
                    style={{
                      padding: '8px 16px',
                      background: deleting === user.userId ? '#f5f5f5' : '#ffffff',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: deleting === user.userId ? '#999' : '#dc2626',
                      cursor: deleting === user.userId ? 'not-allowed' : 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    {deleting === user.userId ? 'Deleting...' : 'Delete User'}
                  </button>
                </div>

                {user.connections.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                    {user.connections.map((conn) => (
                      <div
                        key={conn.id}
                        style={{
                          padding: '12px',
                          background: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>
                            {conn.toolkit}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: conn.status === 'ACTIVE' ? '#dcfce7' : '#fef3c7',
                              color: conn.status === 'ACTIVE' ? '#166534' : '#92400e',
                              fontWeight: '500',
                            }}
                          >
                            {conn.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>
                          {new Date(conn.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}