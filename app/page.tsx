'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

export default function Chat() {
  const { data: session, status } = useSession();
  const { messages, sendMessage, status: chatStatus, error, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });
  const [input, setInput] = useState('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSavedMessageIdRef = useRef<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      loadSessions();
    }
  }, [status, router]);

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/chat/sessions');
      const data = await response.json();
      setSessions(data.sessions || []);
      
      // Load most recent session or create new one
      if (data.sessions && data.sessions.length > 0) {
        loadSession(data.sessions[0].id);
      } else {
        createNewSession();
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSession = async (sessionId: string) => {
    // If switching away from an empty session, delete it
    if (currentSessionId && currentSessionId !== sessionId && messages.length === 0) {
      try {
        await fetch(`/api/chat/sessions/${currentSessionId}`, { method: 'DELETE' });
        setSessions(sessions.filter(s => s.id !== currentSessionId));
      } catch (error) {
        console.error('Error deleting empty session:', error);
      }
    }
    
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`);
      const data = await response.json();
      
      if (data.session) {
        setCurrentSessionId(sessionId);
        // Convert database messages to chat format
        const chatMessages = data.session.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          parts: msg.toolCalls ? [
            ...msg.toolCalls.map((tc: any) => ({
              type: `tool-${tc.toolName}`,
              ...tc
            })),
            { type: 'text', text: msg.content }
          ] : [{ type: 'text', text: msg.content }]
        }));
        setMessages(chatMessages);
        
        // Update the last saved message ID to prevent re-saving when loading
        if (chatMessages.length > 0) {
          const lastMsg = chatMessages[chatMessages.length - 1];
          if (lastMsg.role === 'assistant') {
            lastSavedMessageIdRef.current = lastMsg.id;
          }
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const createNewSession = async () => {
    // Only create new session if current one has messages
    if (currentSessionId && messages.length === 0) {
      // Already have an empty session, just clear it
      return;
    }
    
    try {
      const response = await fetch('/api/chat/sessions', { method: 'POST' });
      const data = await response.json();
      
      if (data.session) {
        setCurrentSessionId(data.session.id);
        setMessages([]);
        setSessions([data.session, ...sessions]);
        // Reset the last saved message ID for new session
        lastSavedMessageIdRef.current = null;
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Delete this chat?')) return;
    
    try {
      await fetch(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions(sessions.filter(s => s.id !== sessionId));
      
      if (sessionId === currentSessionId) {
        if (sessions.length > 1) {
          const nextSession = sessions.find(s => s.id !== sessionId);
          if (nextSession) loadSession(nextSession.id);
        } else {
          createNewSession();
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const saveMessage = async (role: string, content: string, toolCalls?: any) => {
    if (!currentSessionId) return;
    
    try {
      await fetch(`/api/chat/sessions/${currentSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content, toolCalls })
      });
      
      // Only refresh session list to update title/timestamp, don't reload messages
      const response = await fetch('/api/chat/sessions');
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatStatus !== 'ready') return;
    
    const userMessage = input;
    setInput('');
    
    // Save user message
    await saveMessage('user', userMessage);
    
    // Send to AI
    sendMessage({ text: userMessage });
  };

  // Save AI responses (only once per message)
  useEffect(() => {
    if (messages.length > 0 && chatStatus === 'ready') {
      const lastMessage = messages[messages.length - 1];
      
      // Only save if it's an assistant message and we haven't saved this message yet
      if (lastMessage.role === 'assistant' && lastMessage.id !== lastSavedMessageIdRef.current) {
        const content = lastMessage.content || 
          (lastMessage.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || '');
        
        if (content) {
          const toolCalls = lastMessage.parts?.filter((p: any) => p.type?.startsWith('tool-'));
          lastSavedMessageIdRef.current = lastMessage.id;
          saveMessage('assistant', content, toolCalls);
        }
      }
    }
  }, [messages, chatStatus]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Helper function to parse and clean tool calls
  const parseToolCall = (toolName: string) => {
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
    
    if (message.parts && Array.isArray(message.parts)) {
      message.parts.forEach((part: any) => {
        if (part.type && part.type.startsWith('tool-') && part.type !== 'tool-result') {
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

  const groupSessionsByDate = (sessions: ChatSession[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups = {
      today: [] as ChatSession[],
      yesterday: [] as ChatSession[],
      lastWeek: [] as ChatSession[],
      older: [] as ChatSession[]
    };

    sessions.forEach(session => {
      const sessionDate = new Date(session.updatedAt);
      if (sessionDate >= today) {
        groups.today.push(session);
      } else if (sessionDate >= yesterday) {
        groups.yesterday.push(session);
      } else if (sessionDate >= lastWeek) {
        groups.lastWeek.push(session);
      } else {
        groups.older.push(session);
      }
    });

    return groups;
  };

  if (status === 'loading' || loadingSessions) {
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
          <div style={{ background: '#fff3f3', border: '1px solid #fecaca', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ fontWeight: '600', marginBottom: '8px', color: '#991b1b' }}>Error</div>
            <div style={{ fontSize: '14px', color: '#dc2626' }}>{error.message}</div>
          </div>
          <button onClick={() => window.location.reload()} style={{ width: '100%', padding: '12px', background: '#1a1a1a', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const sessionGroups = groupSessionsByDate(sessions);

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#ffffff', overflow: 'hidden' }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Sidebar */}
      <div style={{ 
        width: sidebarOpen ? '280px' : '0', 
        background: '#f9fafb', 
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
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e5e5' }}>
          <button
            onClick={createNewSession}
            style={{
              width: '100%',
              padding: '12px',
              background: '#1a1a1a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '18px' }}>+</span>
            New Chat
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {sessionGroups.today.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px', paddingLeft: '12px' }}>Today</div>
              {sessionGroups.today.map(sess => (
                <div
                  key={sess.id}
                  onClick={() => loadSession(sess.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: sess.id === currentSessionId ? '#e5e7eb' : 'transparent',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                    color: '#1a1a1a'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sess.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(sess.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#999', padding: '0 4px' }}
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {sessionGroups.yesterday.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px', paddingLeft: '12px' }}>Yesterday</div>
              {sessionGroups.yesterday.map(sess => (
                <div
                  key={sess.id}
                  onClick={() => loadSession(sess.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: sess.id === currentSessionId ? '#e5e7eb' : 'transparent',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                    color: '#1a1a1a'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sess.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(sess.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#999', padding: '0 4px' }}
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {sessionGroups.lastWeek.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px', paddingLeft: '12px' }}>Last 7 Days</div>
              {sessionGroups.lastWeek.map(sess => (
                <div
                  key={sess.id}
                  onClick={() => loadSession(sess.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: sess.id === currentSessionId ? '#e5e7eb' : 'transparent',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                    color: '#1a1a1a'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sess.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(sess.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#999', padding: '0 4px' }}
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {sessionGroups.older.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px', paddingLeft: '12px' }}>Older</div>
              {sessionGroups.older.map(sess => (
                <div
                  key={sess.id}
                  onClick={() => loadSession(sess.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: sess.id === currentSessionId ? '#e5e7eb' : 'transparent',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                    color: '#1a1a1a'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sess.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(sess.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#999', padding: '0 4px' }}
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: sidebarOpen ? '280px' : '0', transition: 'margin-left 0.3s', height: '100vh', overflow: 'hidden' }}>
        <header style={{ borderBottom: '1px solid #e5e5e5', background: '#ffffff', position: 'sticky', top: 0, zIndex: 30, flexShrink: 0 }}>
          <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#666', padding: '4px' }}
              >☰</button>
              <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em' }}>
                iSuiteAI
              </h1>
            </div>
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

        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
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
                  
                  const textContent = message.content || 
                    (message.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || '');
                  
                  const isUser = message.role === 'user';
                  
                  return (
                    <div 
                      key={message.id} 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '8px',
                        alignItems: isUser ? 'flex-start' : 'flex-end',
                        maxWidth: '85%',
                        alignSelf: isUser ? 'flex-start' : 'flex-end'
                      }}
                    >
                      <div style={{ 
                        fontSize: '12px', 
                        fontWeight: '600', 
                        color: isUser ? '#2563eb' : '#7c3aed', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em',
                        paddingLeft: isUser ? '4px' : '0',
                        paddingRight: isUser ? '0' : '4px'
                      }}>
                        {isUser ? 'YOU' : 'ISUITEAI'}
                      </div>
                      
                      {!isUser && hasTools && (
                        <div style={{ 
                          width: '100%',
                          marginTop: '4px',
                          marginBottom: '8px',
                          padding: '16px',
                          background: '#faf5ff',
                          border: '1px solid #e9d5ff',
                          borderRadius: '12px',
                          borderTopRightRadius: '4px'
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
                              color: '#7c3aed',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <span>📋</span>
                              Task Progress
                            </div>
                            <div style={{ fontSize: '12px', color: '#7c3aed' }}>
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
                                    background: '#7c3aed',
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
                                    border: '2px solid #7c3aed',
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

                      {textContent && (
                        <div style={{ 
                          fontSize: '15px', 
                          lineHeight: '1.6', 
                          color: '#1a1a1a', 
                          whiteSpace: 'pre-wrap',
                          padding: '14px 16px',
                          background: isUser ? '#eff6ff' : '#faf5ff',
                          borderRadius: '12px',
                          borderTopLeftRadius: isUser ? '4px' : '12px',
                          borderTopRightRadius: isUser ? '12px' : '4px',
                          border: isUser ? '1px solid #dbeafe' : '1px solid #e9d5ff',
                          width: '100%'
                        }}>
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

        <div style={{ position: 'fixed', bottom: 0, left: sidebarOpen ? '280px' : '0', right: 0, background: '#ffffff', borderTop: '1px solid #e5e5e5', transition: 'left 0.3s', zIndex: 30 }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 24px' }}>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '12px' }}>
              <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder="Type a command..." 
                disabled={chatStatus !== 'ready'} 
                style={{ flex: 1, padding: '14px 16px', fontSize: '15px', border: '1px solid #e5e5e5', borderRadius: '8px', outline: 'none', background: '#ffffff', color: '#1a1a1a' }} 
              />
              <button 
                type="submit" 
                disabled={chatStatus !== 'ready' || !input.trim()} 
                style={{ padding: '14px 24px', background: chatStatus !== 'ready' || !input.trim() ? '#f5f5f5' : '#1a1a1a', color: chatStatus !== 'ready' || !input.trim() ? '#999' : '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: chatStatus !== 'ready' || !input.trim() ? 'not-allowed' : 'pointer' }}
              >
                {chatStatus === 'streaming' ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
