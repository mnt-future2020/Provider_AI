'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Chat() {
  const { data: session, status } = useSession();
  const { messages, sendMessage, status: chatStatus, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Helper function to parse and clean tool calls
  const parseToolCall = (toolName: string) => {
    // Remove COMPOSIO_ prefix and convert to readable format
    const cleaned = toolName
      .replace(/^COMPOSIO_/, '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return cleaned;
  };

  // Helper to extract task steps from messages
  const extractTaskSteps = (message: any) => {
    const steps: { name: string; status: 'completed' | 'in-progress' | 'pending'; args?: any }[] = [];
    
    // Check parts for tool calls (this is what Composio uses)
    if (message.parts && Array.isArray(message.parts)) {
      message.parts.forEach((part: any) => {
        // Check if this is a tool call (type starts with "tool-")
        if (part.type && part.type.startsWith('tool-') && part.type !== 'tool-result') {
          // Extract tool name from type (e.g., "tool-COMPOSIO_SEARCH_TOOLS" -> "COMPOSIO_SEARCH_TOOLS")
          const toolName = part.type.replace('tool-', '');
          const status = part.state === 'output-available' ? 'completed' : 'in-progress';
          
          steps.push({
            name: parseToolCall(toolName),
            status: status,
            args: part.input
          });
        }
      });
    }
    
    return steps;
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
        <div style={{ fontSize: '14px', color: '#666' }}>Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
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
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
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
            {chatStatus === 'streaming' && (
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
              {messages.map((message) => {
                const taskSteps = extractTaskSteps(message);
                const hasTools = taskSteps.length > 0;
                
                // Get text content
                const textContent = message.content || 
                  (message.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || '');
                
                return (
                  <div key={message.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {message.role === 'user' ? 'YOU' : 'ISUITEAI'}
                    </div>
                    
                    {/* Show task progress FIRST if tools were used */}
                    {message.role === 'assistant' && hasTools && (
                      <div style={{ 
                        marginTop: '4px',
                        marginBottom: '12px',
                        padding: '16px',
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          marginBottom: '12px'
                        }}>
                          <div style={{ 
                            fontSize: '13px', 
                            fontWeight: '600', 
                            color: '#374151',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span>📋</span>
                            Task Progress
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {taskSteps.filter(s => s.status === 'completed').length}/{taskSteps.length}
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {taskSteps.map((step, idx) => (
                            <div 
                              key={idx}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '10px',
                                fontSize: '13px',
                                color: '#374151'
                              }}
                            >
                              {step.status === 'completed' ? (
                                <div style={{ 
                                  width: '18px', 
                                  height: '18px', 
                                  borderRadius: '50%', 
                                  background: '#10b981',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#ffffff',
                                  fontSize: '10px',
                                  flexShrink: 0
                                }}>✓</div>
                              ) : step.status === 'in-progress' ? (
                                <div style={{ 
                                  width: '18px', 
                                  height: '18px', 
                                  borderRadius: '50%', 
                                  border: '2px solid #3b82f6',
                                  borderTopColor: 'transparent',
                                  animation: 'spin 1s linear infinite',
                                  flexShrink: 0
                                }}></div>
                              ) : (
                                <div style={{ 
                                  width: '18px', 
                                  height: '18px', 
                                  borderRadius: '50%', 
                                  border: '2px solid #d1d5db',
                                  flexShrink: 0
                                }}></div>
                              )}
                              <span style={{ 
                                color: step.status === 'completed' ? '#374151' : '#6b7280'
                              }}>
                                {step.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* User message or AI text response */}
                    {textContent && (
                      <div style={{ fontSize: '15px', lineHeight: '1.6', color: '#1a1a1a', whiteSpace: 'pre-wrap' }}>
                        {textContent}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#ffffff', borderTop: '1px solid #e5e5e5' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 24px' }}>
          <form onSubmit={(e) => { e.preventDefault(); if (input.trim() && chatStatus === 'ready') { sendMessage({ text: input }); setInput(''); } }} style={{ display: 'flex', gap: '12px' }}>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a command..." disabled={chatStatus !== 'ready'} style={{ flex: 1, padding: '14px 16px', fontSize: '15px', border: '1px solid #e5e5e5', borderRadius: '8px', outline: 'none', background: '#ffffff', color: '#1a1a1a' }} />
            <button type="submit" disabled={chatStatus !== 'ready' || !input.trim()} style={{ padding: '14px 24px', background: chatStatus !== 'ready' || !input.trim() ? '#f5f5f5' : '#1a1a1a', color: chatStatus !== 'ready' || !input.trim() ? '#999' : '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: chatStatus !== 'ready' || !input.trim() ? 'not-allowed' : 'pointer' }}>
              {chatStatus === 'streaming' ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
