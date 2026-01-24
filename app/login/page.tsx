'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signIn('google', { callbackUrl });
    } catch (error) {
      console.error('Sign in error:', error);
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#1a1a1a', marginBottom: '8px', letterSpacing: '-0.02em' }}>
          Welcome to iSuite
        </h1>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Sign in to continue
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: loading ? '#f5f5f5' : '#ffffff',
            color: '#1a1a1a',
            border: '1px solid #e5e5e5',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.background = '#f9f9f9';
              e.currentTarget.style.borderColor = '#d4d4d4';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#e5e5e5';
            }
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853"/>
            <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
          </svg>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>
      </div>

      <p style={{ marginTop: '24px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
        Secure authentication powered by NextAuth
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
      <Suspense fallback={
        <div style={{ width: '100%', maxWidth: '400px', padding: '24px', textAlign: 'center' }}>
          <p style={{ color: '#666' }}>Loading...</p>
        </div>
      }>
        <LoginContent />
      </Suspense>
    </div>
  );
}
