'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#1a1a1a', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            Welcome to iSuiteAI
          </h1>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Sign in to continue
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#1a1a1a', marginBottom: '6px' }}>
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '14px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                outline: 'none',
                background: '#ffffff',
                color: '#1a1a1a',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#d4d4d4'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e5e5e5'}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#1a1a1a', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '14px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                outline: 'none',
                background: '#ffffff',
                color: '#1a1a1a',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#d4d4d4'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e5e5e5'}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              background: '#fff3f3',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#dc2626'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#f5f5f5' : '#1a1a1a',
              color: loading ? '#999' : '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px'
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{ marginTop: '24px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
          Demo mode: Enter any name and email to continue
        </p>
      </div>
    </div>
  );
}
