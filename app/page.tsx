'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  PanelLeftClose, 
  PanelLeft, 
  SquarePen, 
  Zap, 
  Search, 
  X,
  LogOut,
  Hand,
  ArrowUp,
  Send,
  Settings,
  ChevronUp
} from 'lucide-react';

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

export default function Chat() {
  const { data: session, status } = useSession();
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const { messages, sendMessage, status: chatStatus, error, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    onError: (err) => {
      console.error('Chat error:', err);
      // Check for rate limit error
      if (err.message?.includes('429') || err.message?.includes('rate_limit') || err.message?.includes('Rate limit')) {
        setRateLimitError('Rate limit reached. Please wait 30 seconds and try again.');
        setTimeout(() => setRateLimitError(null), 30000); // Clear after 30 seconds
      }
    },
  });
  const [input, setInput] = useState('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSavedMessageIdRef = useRef<string | null>(null);
  const router = useRouter();

  // Filter sessions based on search query
  const filteredSessions = sessions.filter(sess => 
    sess.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle tool card expansion
  const toggleToolExpanded = (messageId: string) => {
    setExpandedTools(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  // Simple markdown renderer
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    
    // Split by lines and process each
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    
    lines.forEach((line, lineIdx) => {
      // Process inline formatting
      let processed: React.ReactNode[] = [];
      let remaining = line;
      let keyIdx = 0;
      
      // Pattern for **bold**, *italic*, `code`, and [link](url)
      const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g;
      let lastIndex = 0;
      let match;
      
      while ((match = regex.exec(remaining)) !== null) {
        // Add text before match
        if (match.index > lastIndex) {
          processed.push(remaining.slice(lastIndex, match.index));
        }
        
        if (match[2]) {
          // **bold**
          processed.push(<strong key={`b-${lineIdx}-${keyIdx++}`}>{match[2]}</strong>);
        } else if (match[3]) {
          // *italic*
          processed.push(<em key={`i-${lineIdx}-${keyIdx++}`}>{match[3]}</em>);
        } else if (match[4]) {
          // `code`
          processed.push(
            <code key={`c-${lineIdx}-${keyIdx++}`} style={{ 
              background: '#f3f4f6', 
              padding: '2px 6px', 
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: 'monospace'
            }}>{match[4]}</code>
          );
        } else if (match[5] && match[6]) {
          // [link](url)
          processed.push(
            <a 
              key={`a-${lineIdx}-${keyIdx++}`} 
              href={match[6]} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#6366f1', textDecoration: 'underline' }}
            >{match[5]}</a>
          );
        }
        
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text
      if (lastIndex < remaining.length) {
        processed.push(remaining.slice(lastIndex));
      }
      
      // If no matches, just use the line as-is
      if (processed.length === 0) {
        processed.push(line);
      }
      
      // Handle list items
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ')) {
        elements.push(
          <div key={`line-${lineIdx}`} style={{ display: 'flex', gap: '8px', marginLeft: '8px' }}>
            <span>•</span>
            <span>{processed.slice(0).map((p, i) => typeof p === 'string' ? p.replace(/^[-•]\s*/, '') : p)}</span>
          </div>
        );
      } else if (line === '') {
        elements.push(<br key={`br-${lineIdx}`} />);
      } else {
        elements.push(<div key={`line-${lineIdx}`}>{processed}</div>);
      }
    });
    
    return elements;
  };

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
      const lastMessage = messages[messages.length - 1] as any;
      
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

  // Extract toolkit from tool slug (e.g., GMAIL_SEND_EMAIL -> gmail)
  const extractToolkit = (toolSlug: string): string => {
    if (toolSlug.startsWith('COMPOSIO_')) return 'composio';
    const parts = toolSlug.split('_');
    return parts.length > 1 ? parts[0].toLowerCase() : 'unknown';
  };

  // Get logo URL for a toolkit
  const getToolkitLogo = (toolkit: string): string => {
    if (toolkit === 'unknown') return '';
    if (toolkit === 'composio') return 'https://avatars.githubusercontent.com/u/156948988?s=200&v=4';
    return `https://logos.composio.dev/api/${toolkit}`;
  };

  // Extract actual tool from COMPOSIO meta-tools
  const extractActualTool = (toolSlug: string, input: any): { toolkit: string; name: string } | null => {
    if (!input) return null;
    
    // COMPOSIO_MULTI_EXECUTE_TOOL: { tools: [{ tool_slug: "GMAIL_SEND_EMAIL", arguments: {...} }] }
    if (toolSlug === 'COMPOSIO_MULTI_EXECUTE_TOOL' && input.tools && Array.isArray(input.tools) && input.tools.length > 0) {
      const firstTool = input.tools[0];
      const actualToolSlug = firstTool.tool_slug || firstTool.toolSlug || firstTool.name;
      
      if (actualToolSlug && typeof actualToolSlug === 'string') {
        const toolkit = extractToolkit(actualToolSlug);
        return { toolkit, name: parseToolName(actualToolSlug) };
      }
    }
    
    // COMPOSIO_SEARCH_TOOLS: { queries: [{ use_case: "send email" }] }
    if (toolSlug === 'COMPOSIO_SEARCH_TOOLS' && input.queries && Array.isArray(input.queries) && input.queries.length > 0) {
      const useCase = input.queries[0].use_case || '';
      // Try to detect toolkit from use case
      const useCaseLower = useCase.toLowerCase();
      if (useCaseLower.includes('email') || useCaseLower.includes('gmail')) {
        return { toolkit: 'gmail', name: 'Finding email tools' };
      } else if (useCaseLower.includes('sheet') || useCaseLower.includes('spreadsheet')) {
        return { toolkit: 'googlesheets', name: 'Finding spreadsheet tools' };
      } else if (useCaseLower.includes('doc')) {
        return { toolkit: 'googledocs', name: 'Finding document tools' };
      } else if (useCaseLower.includes('calendar')) {
        return { toolkit: 'googlecalendar', name: 'Finding calendar tools' };
      } else if (useCaseLower.includes('slack')) {
        return { toolkit: 'slack', name: 'Finding Slack tools' };
      } else if (useCaseLower.includes('github')) {
        return { toolkit: 'github', name: 'Finding GitHub tools' };
      }
      // Fallback: show search icon
      return { toolkit: 'composio', name: 'Searching for tools' };
    }
    
    return null;
  };

  // Get display name for toolkit
  const getToolkitDisplayName = (toolkit: string): string => {
    const names: Record<string, string> = {
      gmail: 'Gmail',
      googlesheets: 'Google Sheets',
      googledocs: 'Google Docs',
      googlecalendar: 'Google Calendar',
      googledrive: 'Google Drive',
      github: 'GitHub',
      slack: 'Slack',
      notion: 'Notion',
      whatsapp: 'WhatsApp',
      discord: 'Discord',
      twitter: 'Twitter',
      linkedin: 'LinkedIn',
      composio: 'Composio',
    };
    return names[toolkit] || toolkit.charAt(0).toUpperCase() + toolkit.slice(1);
  };

  // Parse tool name to readable format
  const parseToolName = (toolSlug: string): string => {
    // Handle Composio internal tools
    const composioNames: Record<string, string> = {
      'COMPOSIO_SEARCH_TOOLS': 'Search Tools',
      'COMPOSIO_MULTI_EXECUTE_TOOL': 'Execute Tools',
      'COMPOSIO_MANAGE_CONNECTIONS': 'Manage Connections',
      'COMPOSIO_REMOTE_WORKBENCH': 'Process Request',
    };
    
    if (composioNames[toolSlug]) {
      return composioNames[toolSlug];
    }
    
    // Format: TOOLKIT_ACTION_NAME -> Toolkit Action Name
    const parts = toolSlug.split('_');
    if (parts.length > 1) {
      const toolkit = getToolkitDisplayName(parts[0].toLowerCase());
      const action = parts.slice(1)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      return `${toolkit} ${action}`;
    }
    
    return toolSlug
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Helper to extract task steps from messages
  const extractTaskSteps = (message: any) => {
    const steps: { 
      slug: string;
      name: string; 
      toolkit: string;
      logo: string;
      status: 'completed' | 'in-progress' | 'pending'; 
    }[] = [];
    
    if (message.parts && Array.isArray(message.parts)) {
      message.parts.forEach((part: any) => {
        if (part.type && part.type.startsWith('tool-') && part.type !== 'tool-result') {
          const toolSlug = part.type.replace('tool-', '');
          const status = part.state === 'output-available' ? 'completed' : 'in-progress';
          
          // Try to extract actual tool from args for meta-tools
          const actualTool = extractActualTool(toolSlug, part.input);
          
          if (actualTool) {
            // Use the actual tool info
            steps.push({
              slug: toolSlug,
              name: actualTool.name,
              toolkit: actualTool.toolkit,
              logo: getToolkitLogo(actualTool.toolkit),
              status: status,
            });
          } else {
            // Fallback to parsing the tool slug directly
            const toolkit = extractToolkit(toolSlug);
            steps.push({
              slug: toolSlug,
              name: parseToolName(toolSlug),
              toolkit: toolkit,
              logo: getToolkitLogo(toolkit),
              status: status,
            });
          }
        }
      });
    }
    
    return steps;
  };

  // Generate a summary description for the task
  const getTaskSummary = (steps: { name: string; toolkit: string }[]): string => {
    if (steps.length === 0) return 'Processing...';
    
    // Get unique toolkits (excluding composio internal)
    const toolkits = [...new Set(steps.map(s => s.toolkit).filter(t => t !== 'composio'))];
    
    if (toolkits.length === 0) {
      return 'Processing request...';
    } else if (toolkits.length === 1) {
      return `Using ${getToolkitDisplayName(toolkits[0])}`;
    } else {
      return `Using ${toolkits.slice(0, 2).map(t => getToolkitDisplayName(t)).join(', ')}${toolkits.length > 2 ? ` +${toolkits.length - 2}` : ''}`;
    }
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
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 500px; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .tool-card {
          animation: fadeIn 0.3s ease-out;
        }
        .tool-row {
          animation: fadeIn 0.2s ease-out;
        }
        .sidebar-item:hover {
          background: #f9fafb;
        }
      `}</style>

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
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a' }}>iSuite</span>
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
            onClick={createNewSession}
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

          {/* Apps */}
          <div
            onClick={() => router.push('/connections')}
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
              width: sidebarOpen ? 'auto' : '40px',
              height: sidebarOpen ? 'auto' : '40px'
            }}
          >
            <Zap size={18} color="#1a1a1a" />
            {sidebarOpen && 'Apps'}
          </div>
        </div>

        {/* Recents Section - Only show when expanded */}
        {sidebarOpen && (
          <div style={{ padding: '16px 12px 8px', borderTop: '1px solid #f0f0f0' }}>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '500', 
              color: '#999', 
              marginBottom: '12px', 
              paddingLeft: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Recents
            </div>
            
            {/* Search Box */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e5e5',
              marginBottom: '12px'
            }}>
              <Search size={16} color="#999" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '14px',
                  color: '#1a1a1a'
                }}
              />
            </div>
          </div>
        )}

        {/* Chat History - Only show when expanded */}
        {sidebarOpen && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
            {filteredSessions.length === 0 ? (
              <div style={{ 
                padding: '20px', 
                textAlign: 'center', 
                color: '#999', 
                fontSize: '13px' 
              }}>
                {searchQuery ? 'No chats found' : 'No recent chats'}
              </div>
            ) : (
              filteredSessions.map(sess => (
                <div
                  key={sess.id}
                  onClick={() => loadSession(sess.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: sess.id === currentSessionId ? '#f3f4f6' : 'transparent',
                    marginBottom: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                    color: '#1a1a1a',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    if (sess.id !== currentSessionId) {
                      e.currentTarget.style.background = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (sess.id !== currentSessionId) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span style={{ 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    flex: 1
                  }}>
                    {sess.title}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(sess.id); }}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      padding: '2px',
                      opacity: 0.6,
                      transition: 'opacity 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                  >
                    <X size={14} color="#999" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

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

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: sidebarOpen ? '280px' : '60px', transition: 'margin-left 0.3s', height: '100vh', overflow: 'hidden' }}>
        <header style={{ borderBottom: '1px solid #e5e5e5', background: '#ffffff', position: 'sticky', top: 0, zIndex: 30, flexShrink: 0, minHeight: '57px' }}>
          <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            {chatStatus === 'streaming' && (
              <div style={{ fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  background: '#2196F3', 
                  borderRadius: '50%',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}></div>
                Processing...
              </div>
            )}
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px 120px' }}>
            {messages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '60px' }}>
                {/* Greeting */}
                <h2 style={{ 
                  fontSize: '32px', 
                  fontWeight: '600', 
                  color: '#1a1a1a', 
                  marginBottom: '32px', 
                  letterSpacing: '-0.02em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <Hand size={36} color="#1a1a1a" />
                  Hello there, <span style={{ color: '#2196F3' }}>{session?.user?.name?.split(' ')[0] || 'User'}!</span>
                </h2>

                {/* Centered Input Box */}
                <form 
                  onSubmit={handleSendMessage} 
                  style={{ 
                    width: '100%', 
                    maxWidth: '600px', 
                    marginBottom: '48px'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#ffffff',
                    border: '1px solid #e5e5e5',
                    borderRadius: '12px',
                    padding: '4px 4px 4px 16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    <input 
                      type="text" 
                      value={input} 
                      onChange={(e) => setInput(e.target.value)} 
                      placeholder="Hey iSuiteAI, can you..." 
                      disabled={chatStatus !== 'ready'} 
                      style={{ 
                        flex: 1, 
                        padding: '14px 0', 
                        fontSize: '15px', 
                        border: 'none', 
                        outline: 'none', 
                        background: 'transparent', 
                        color: '#1a1a1a' 
                      }} 
                    />
                    <button 
                      type="submit" 
                      disabled={chatStatus !== 'ready' || !input.trim()} 
                      style={{ 
                        width: '40px',
                        height: '40px',
                        background: chatStatus !== 'ready' || !input.trim() ? '#f5f5f5' : '#2196F3', 
                        color: '#ffffff', 
                        border: 'none', 
                        borderRadius: '10px', 
                        cursor: chatStatus !== 'ready' || !input.trim() ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <ArrowUp size={20} color={chatStatus !== 'ready' || !input.trim() ? '#999' : '#ffffff'} />
                    </button>
                  </div>
                </form>

                {/* Suggestion Cards */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '16px', 
                  width: '100%', 
                  maxWidth: '800px'
                }}>
                  {[
                    { 
                      logo: 'https://logos.composio.dev/api/gmail',
                      title: "Summarize today's emails",
                      prompt: "Summarize my emails from today"
                    },
                    { 
                      logo: 'https://logos.composio.dev/api/googledocs',
                      title: 'Create a document',
                      prompt: 'Create a Google Doc about'
                    },
                    { 
                      logo: 'https://logos.composio.dev/api/googlesheets',
                      title: 'Create a spreadsheet',
                      prompt: 'Create a Google Sheet with'
                    },
                    { 
                      logo: 'https://logos.composio.dev/api/googlecalendar',
                      title: 'Schedule a meeting',
                      prompt: 'Schedule a meeting for'
                    },
                    { 
                      logo: 'https://logos.composio.dev/api/googledrive',
                      title: 'Organize my files',
                      prompt: 'Help me organize my Google Drive files'
                    },
                    { 
                      logo: 'https://logos.composio.dev/api/gmail',
                      title: 'Send an email',
                      prompt: 'Send an email to'
                    },
                  ].map((suggestion, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        padding: '20px',
                        background: '#ffffff',
                        border: '1px solid #e5e5e5',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        transition: 'box-shadow 0.2s, border-color 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                        e.currentTarget.style.borderColor = '#d1d5db';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = '#e5e5e5';
                      }}
                    >
                      {/* Logo */}
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: '#f9fafb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}>
                        <img 
                          src={suggestion.logo} 
                          alt="" 
                          style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                      
                      {/* Title */}
                      <div style={{ 
                        fontSize: '15px', 
                        fontWeight: '500', 
                        color: '#1a1a1a',
                        lineHeight: '1.4'
                      }}>
                        {suggestion.title}
                      </div>
                      
                      {/* Bottom row */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        marginTop: 'auto'
                      }}>
                        <button 
                          onClick={() => setInput(suggestion.prompt)}
                          style={{ 
                            padding: '8px 14px',
                            background: '#e3f2fd',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#2196F3',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Zap size={12} />
                          Try Prompt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {messages.map((msg) => {
                  const message = msg as any;
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
                        {isUser ? 'YOU' : 'ISUITE'}
                      </div>
                      
                      {!isUser && hasTools && (() => {
                        const completedCount = taskSteps.filter(s => s.status === 'completed').length;
                        const isAllCompleted = completedCount === taskSteps.length;
                        const isExpanded = expandedTools.has(message.id);
                        
                        return (
                          <div 
                            className="tool-card"
                            style={{ 
                              width: '100%',
                              marginTop: '4px',
                              marginBottom: '8px',
                              background: '#ffffff',
                              border: '1px solid #e5e7eb',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            }}
                          >
                            {/* Header - Always visible */}
                            <div 
                              onClick={() => toggleToolExpanded(message.id)}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                cursor: 'pointer',
                                background: '#fafafa',
                                borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {/* Lightning icon */}
                                <Zap size={14} color="#1a1a1a" />
                                
                                {/* Summary text */}
                                <span style={{ 
                                  fontSize: '13px', 
                                  fontWeight: '500', 
                                  color: '#374151' 
                                }}>
                                  {getTaskSummary(taskSteps)}
                                </span>
                                
                                {/* Status badge */}
                                <span style={{ 
                                  fontSize: '11px', 
                                  color: isAllCompleted ? '#059669' : '#6366f1',
                                  fontWeight: '500',
                                }}>
                                  {isAllCompleted ? 'Completed' : 'Running...'}
                                </span>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {/* Tool count */}
                                <span style={{ 
                                  fontSize: '12px', 
                                  color: '#9ca3af' 
                                }}>
                                  {taskSteps.length} tool{taskSteps.length !== 1 ? 's' : ''}
                                </span>
                                
                                {/* Completion badge */}
                                <span style={{ 
                                  fontSize: '11px', 
                                  color: isAllCompleted ? '#059669' : '#6366f1',
                                  background: isAllCompleted ? '#ecfdf5' : '#eef2ff',
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                  fontWeight: '500',
                                }}>
                                  {isAllCompleted ? 'All tools completed' : `${completedCount}/${taskSteps.length} completed`}
                                </span>
                                
                                {/* Checkmark or count */}
                                <span style={{ 
                                  fontSize: '12px', 
                                  color: isAllCompleted ? '#059669' : '#6366f1',
                                  fontWeight: '600',
                                }}>
                                  {isAllCompleted ? '✓' : ''}{taskSteps.length}
                                </span>
                                
                                {/* Expand arrow */}
                                <span style={{ 
                                  fontSize: '12px', 
                                  color: '#9ca3af',
                                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s ease',
                                }}>
                                  ▼
                                </span>
                              </div>
                            </div>
                            
                            {/* Expanded content - Tool list */}
                            {isExpanded && (
                              <div style={{ padding: '12px 16px' }}>
                                {taskSteps.map((step, idx) => (
                                  <div 
                                    key={idx}
                                    className="tool-row"
                                    style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'space-between',
                                      padding: '10px 12px',
                                      background: '#f9fafb',
                                      borderRadius: '8px',
                                      marginBottom: idx < taskSteps.length - 1 ? '8px' : '0',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      {/* Toolkit Logo */}
                                      <div style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '4px',
                                        background: '#ffffff',
                                        border: '1px solid #e5e7eb',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                        flexShrink: 0,
                                      }}>
                                        {step.logo ? (
                                          <img 
                                            src={step.logo} 
                                            alt={step.toolkit}
                                            style={{ 
                                              width: '16px', 
                                              height: '16px', 
                                              objectFit: 'contain' 
                                            }}
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              target.style.display = 'none';
                                            }}
                                          />
                                        ) : (
                                          <Zap size={12} color="#666" />
                                        )}
                                      </div>
                                      
                                      {/* Tool name */}
                                      <span style={{ 
                                        fontSize: '13px', 
                                        fontWeight: '500', 
                                        color: '#374151' 
                                      }}>
                                        {step.name}
                                      </span>
                                    </div>
                                    
                                    {/* Status indicator */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      {step.status === 'completed' ? (
                                        <>
                                          <div style={{ 
                                            width: '8px', 
                                            height: '8px', 
                                            borderRadius: '50%', 
                                            background: '#10b981' 
                                          }}></div>
                                          <span style={{ 
                                            fontSize: '11px', 
                                            color: '#059669',
                                            fontWeight: '500'
                                          }}>✓</span>
                                        </>
                                      ) : (
                                        <>
                                          <div style={{ 
                                            width: '8px', 
                                            height: '8px', 
                                            borderRadius: '50%', 
                                            background: '#6366f1',
                                            animation: 'spin 1s linear infinite'
                                          }}></div>
                                          <span style={{ 
                                            fontSize: '11px', 
                                            color: '#6366f1',
                                            fontWeight: '500'
                                          }}>●</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {textContent && (
                        <div style={{ 
                          fontSize: '15px', 
                          lineHeight: '1.7', 
                          color: '#1a1a1a', 
                          padding: '14px 16px',
                          background: isUser ? '#eff6ff' : '#faf5ff',
                          borderRadius: '12px',
                          borderTopLeftRadius: isUser ? '4px' : '12px',
                          borderTopRightRadius: isUser ? '12px' : '4px',
                          border: isUser ? '1px solid #dbeafe' : '1px solid #e9d5ff',
                          width: '100%'
                        }}>
                          {isUser ? textContent : renderMarkdown(textContent)}
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

        {/* Rate limit error notification */}
        {rateLimitError && (
          <div style={{ 
            position: 'fixed', 
            bottom: messages.length > 0 ? '90px' : '20px', 
            left: sidebarOpen ? '280px' : '60px', 
            right: 0, 
            zIndex: 40,
            display: 'flex',
            justifyContent: 'center',
            transition: 'left 0.3s'
          }}>
            <div style={{ 
              background: '#fef3c7', 
              border: '1px solid #f59e0b', 
              borderRadius: '8px', 
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <span style={{ fontSize: '14px', color: '#92400e' }}>{rateLimitError}</span>
              <button 
                onClick={() => setRateLimitError(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={16} color="#92400e" />
              </button>
            </div>
          </div>
        )}

        {/* Bottom fixed input - only show when there are messages */}
        {messages.length > 0 && (
          <div style={{ position: 'fixed', bottom: 0, left: sidebarOpen ? '280px' : '60px', right: 0, background: '#ffffff', borderTop: '1px solid #e5e5e5', transition: 'left 0.3s', zIndex: 30 }}>
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
                  style={{ padding: '14px 24px', background: chatStatus !== 'ready' || !input.trim() ? '#f5f5f5' : '#2196F3', color: chatStatus !== 'ready' || !input.trim() ? '#999' : '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: chatStatus !== 'ready' || !input.trim() ? 'not-allowed' : 'pointer' }}
                >
                  {chatStatus === 'streaming' ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
