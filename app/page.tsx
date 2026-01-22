'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
}

export default function Chat() {
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });
  const [input, setInput] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      
      if (data.user) {
        setUser(data.user);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
        <div style={{ fontSize: '14px', color: '#666' }}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ maxWidth: '500px', width: '100%' }}>
          <div style={{ 
            background: '#fff3f3', 
            border: '1px solid #fecaca', 
            borderRadius: '8px', 
            padding: '20px',
            marginBottom: '16px'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '8px', color: '#991b1b' }}>Error</div>
            <div style={{ fontSize: '14px', color: '#dc2626' }}>{error.message}</div>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              width: '100%',
              padding: '12px',
              background: '#1a1a1a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      <header style={{ 
        borderBottom: '1px solid #e5e5e5',
        background: '#ffffff',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ 
          maxWidth: '900px', 
          margin: '0 auto', 
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h1 style={{ 
            fontSize: '20px', 
            fontWeight: '600',
            color: '#1a1a1a',
            margin: 0,
            letterSpacing: '-0.01em'
          }}>
            iSuiteAI
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {status === 'streaming' && (
              <div style={{ fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', background: '#666', borderRadius: '50%' }}></div>
                Processing
              </div>
            )}
            <button onClick={() => router.push('/connections')} style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', color: '#1a1a1a', cursor: 'pointer', fontWeight: '500' }}>
              Connections
            </button>
            <button onClick={handleLogout} style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', color: '#1a1a1a', cursor: 'pointer', fontWeight: '500' }}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px 120px' }}>
          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '80px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '600', color: '#1a1a1a', marginBottom: '12px', letterSpacing: '-0.02em' }}>
                What can I help you with?
              </h2>
              <p style={{ fontSize: '15px', color: '#666', marginBottom: '48px', textAlign: 'center', maxWidth: '500px' }}>
                Automate your workflow with intelligent task execution
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', width: '100%', maxWidth: '700px' }}>
                {[
                  { text: 'Star a GitHub repository', prompt: 'Star a repository on GitHub' },
                  { text: 'Send an email', prompt: 'Send an email' },
                  { text: 'Manage calendar events', prompt: 'Help me manage my calendar' },
                  { text: 'Create a task', prompt: 'Create a new task' },
                ].map((suggestion, idx) => (
                  <button key={idx} onClick={() => setInput(suggestion.prompt)} style={{ padding: '16px 20px', background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '8px', fontSize: '14px', color: '#1a1a1a', textAlign: 'left', cursor: 'pointer', fontWeight: '500' }}>
                    {suggestion.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {messages.map((message) => (
                <div key={message.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {message.role === 'user' ? 'You' : 'iSuiteAI'}
                  </div>
                  <div style={{ fontSize: '15px', lineHeight: '1.6', color: '#1a1a1a' }}>
                    {message.parts.map((part, index) => {
                      if (part.type === 'text') {
                        return <div key={index} style={{ whiteSpace: 'pre-wrap' }}>{part.text}</div>;
                      }
                      if (part.type.startsWith('tool-')) {
                        return (
                          <div key={index} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', background: '#f5f5f5', color: '#666', padding: '6px 12px', borderRadius: '6px', marginTop: '8px', border: '1px solid #e5e5e5' }}>
                            <span>⚙</span>
                            <span>{part.type.replace('tool-', '')}</span>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#ffffff', borderTop: '1px solid #e5e5e5' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 24px' }}>
          <form onSubmit={(e) => { e.preventDefault(); if (input.trim() && status === 'ready') { sendMessage({ text: input }); setInput(''); } }} style={{ display: 'flex', gap: '12px' }}>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a command..." disabled={status !== 'ready'} style={{ flex: 1, padding: '14px 16px', fontSize: '15px', border: '1px solid #e5e5e5', borderRadius: '8px', outline: 'none', background: '#ffffff', color: '#1a1a1a' }} />
            <button type="submit" disabled={status !== 'ready' || !input.trim()} style={{ padding: '14px 24px', background: status !== 'ready' || !input.trim() ? '#f5f5f5' : '#1a1a1a', color: status !== 'ready' || !input.trim() ? '#999' : '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: status !== 'ready' || !input.trim() ? 'not-allowed' : 'pointer' }}>
              {status === 'streaming' ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
