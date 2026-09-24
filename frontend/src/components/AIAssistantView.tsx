import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useToast } from './ToastProvider';
import { streamChat, getConversation, deleteConversation } from '../api/aiClient';
import type { SSECallbacks } from '../api/aiClient';
import ReactMarkdown from 'react-markdown';

export default function AIAssistantView({ role, user }: { role: string, user?: any }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionId = searchParams.get('session') || '';
  
  const [inputText, setInputText] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const abortRef = useRef<AbortController | null>(null);

  // Role-based quick prompts (hardcoded — AI Platform has no /history endpoint)
  const quickPrompts = useCallback(() => {
    const basePrompts = [
      'Show me a summary of today\'s attendance',
      'What pending approvals do I have?',
      'Show organization department structure',
    ];
    const adminPrompts = [
      'Create a new department',
      'Show employee onboarding status',
      'Generate a workforce report',
    ];
    const managerPrompts = [
      'Show my team\'s leave balances',
      'Review pending leave requests',
    ];
    if (role === 'admin' || role === 'superadmin') return [...basePrompts, ...adminPrompts];
    if (role === 'manager') return [...basePrompts, ...managerPrompts];
    return basePrompts;
  }, [role])();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  
  // Saved past sessions for the sidebar
  const [savedSessions, setSavedSessions] = useState<Array<{ id: string, title: string, messages: any[] }>>([]);
  
  const { showToast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  // 0. Process initial query from dashboard navigation
  useEffect(() => {
    if (location.state?.initialQuery) {
      const q = location.state.initialQuery;
      // Clear state so it doesn't fire again on reload
      window.history.replaceState({}, document.title);
      // Give UI a tiny bit of time to settle before firing
      setTimeout(() => {
        handleSend(q);
      }, 100);
    }
  }, []);

  const loadSessionsList = async () => {
    // Note: The AI Platform currently doesn't have a list-all-conversations
    // endpoint. Sessions are managed client-side via localStorage for now.
    try {
      const stored = localStorage.getItem('ai_sessions');
      if (stored) setSavedSessions(JSON.parse(stored));
    } catch (e) {
      console.error('Failed to load conversation list', e);
    }
  };

  const persistSessionList = (sessions: typeof savedSessions) => {
    setSavedSessions(sessions);
    localStorage.setItem('ai_sessions', JSON.stringify(sessions));
  };

  // 1. Load sessions list on mount
  useEffect(() => {
    loadSessionsList();
  }, [role]);

  // Fetch session history from AI Platform if we have a sessionId
  // Skip if we're actively streaming (abortRef is set) — the onSession callback
  // updates the URL mid-stream, and we must NOT wipe messages during that.
  useEffect(() => {
    if (sessionId && !abortRef.current) {
      const fetchHistory = async () => {
        try {
          setIsLoading(true);
          const res = await getConversation(sessionId);
          if (res?.success && res?.messages) {
             const loadedMessages = res.messages.map((m: any, idx: number) => ({
               id: idx,
               sender: m.role === 'model' || m.role === 'assistant' ? 'ai' : 'user',
               text: m.content || m.text || '',
               widgets: [],
               time: m.timestamp
                 ? new Date(m.timestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                 : ''
             }));
             setMessages(loadedMessages);
          }
        } catch (e) {
          console.error('[AI] Failed to load conversation history:', e);
          setMessages([]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchHistory();
    } else if (!sessionId) {
      setMessages([]);
    }
  }, [sessionId]);

  // 2. Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // 3. Handle sending query — streams response from AI Platform via SSE
  const handleSend = async (text: string = inputText) => {
    if (!text.trim() && !attachedFile) return;
    
    const fullText = attachedFile ? `${text.trim() || 'Attached a file'} [File: ${attachedFile.name}]` : text;
    
    const userMsg = { 
      id: Date.now(), 
      sender: 'user', 
      text: fullText,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
    };

    setAttachedFile(null);
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // We'll accumulate streaming tokens into this message
    const aiMsgId = Date.now() + 1;
    const streamingWidgets: Array<{ type: string; payload: any }> = [];
    let streamedText = '';

    // Add a placeholder AI message that will be updated as tokens stream in
    setMessages(prev => [...prev, {
      id: aiMsgId,
      sender: 'ai',
      text: '',
      widgets: [],
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    }]);

    const callbacks: SSECallbacks = {
      onSession: (data) => {
        // Update session ID if the AI Platform assigned a new one
        if (data.sessionId && data.sessionId !== sessionId) {
          setSearchParams({ session: data.sessionId });
          // Persist to sidebar
          const newSession = {
            id: data.sessionId,
            title: fullText.slice(0, 50) + (fullText.length > 50 ? '...' : ''),
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setSavedSessions(prev => {
            const updated = [newSession, ...prev.filter(s => (s.id) !== data.sessionId)];
            localStorage.setItem('ai_sessions', JSON.stringify(updated));
            return updated;
          });
        }
      },
      onToken: (data) => {
        streamedText += data.content;
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, text: streamedText } : m
        ));
      },
      onToolStart: (data) => {
        streamingWidgets.push({ type: `tool:${data.name}`, payload: { status: 'running', args: data.args } });
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, widgets: [...streamingWidgets] } : m
        ));
      },
      onToolResult: (data) => {
        // Update the last widget for this tool with the result
        const idx = streamingWidgets.findIndex(w => w.type === `tool:${data.name}`);
        if (idx >= 0) {
          streamingWidgets[idx] = { type: `tool:${data.name}`, payload: { status: 'completed', result: data.result } };
        } else {
          streamingWidgets.push({ type: `tool:${data.name}`, payload: { status: 'completed', result: data.result } });
        }
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, widgets: [...streamingWidgets] } : m
        ));
      },
      onDone: () => {
        setIsLoading(false);
      },
      onError: (data) => {
        console.error('[AI] Stream error:', data.message);
        const errorText = streamedText
          ? streamedText + `\n\n⚠️ ${data.message}`
          : `⚠️ ${data.message}`;
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, text: errorText } : m
        ));
        setIsLoading(false);
      },
    };

    try {
      await streamChat(fullText, sessionId || undefined, undefined, callbacks, controller.signal);
    } catch (error: any) {
      if (error.name === 'AbortError') return; // User cancelled
      console.error('[AI] Chat request failed:', error);
      
      const isNetworkError = !error.response && error.message?.includes('fetch');
      const errorText = isNetworkError
        ? '⚠️ Cannot reach the AI Platform (port 8001). Please ensure the AI service is running with `cd ai && npm run dev`.'
        : `⚠️ AI request failed: ${error.message || 'Unknown error'}`;

      showToast('AI Error', 'error', isNetworkError ? 'AI Platform unreachable' : error.message);
      setMessages(prev => prev.map(m =>
        m.id === aiMsgId ? { ...m, text: errorText } : m
      ));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  const clearSession = () => {
    setSearchParams({});
    setMessages([]);
  };

  const loadSession = (session: any) => {
    setSearchParams({ session: session._id || session.id });
    if (window.innerWidth < 768) setSidebarCollapsed(true);
  };

  const deleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
      showToast('Deleted', 'success', 'Conversation deleted.');
      if (sessionId === id) {
        clearSession();
      }
      // Remove from local list
      const updated = savedSessions.filter(s => (s.id) !== id);
      persistSessionList(updated);
    } catch (err) {
      console.error('[AI] Failed to delete conversation:', err);
      showToast('Error', 'error', 'Failed to delete conversation.');
    }
  };

  // 4. Dynamic Widget Renderer
  const renderWidget = (type: string, payload: any, idx: number) => {
    if (!type || !payload) return null;

    return (
      <div key={idx} className="glass-cutout" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-metadata text-secondary">Tool Executed: {type}</span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-accent)' }}>build</span>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', fontSize: '13px', overflowX: 'auto' }}>
           <pre style={{ margin: 0, color: 'var(--color-ui-element)' }}>{JSON.stringify(payload, null, 2)}</pre>
        </div>
      </div>
    );
  };

  return (
    <main style={{ height: 'calc(100vh - 120px)', display: 'flex', gap: '24px' }}>
      
      {/* Sidebar: Chat History */}
      <div
        className="glass-panel"
        style={{
          width: sidebarCollapsed ? '52px' : '280px',
          minWidth: sidebarCollapsed ? '52px' : '280px',
          padding: sidebarCollapsed ? '16px 10px' : '24px',
          paddingBottom: '100px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          transition: 'width 0.3s cubic-bezier(0.16,1,0.3,1), min-width 0.3s cubic-bezier(0.16,1,0.3,1), padding 0.2s ease',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', marginBottom: sidebarCollapsed ? '0' : '24px' }}>
          {!sidebarCollapsed && <h3 style={{ fontSize: '18px', margin: 0 }}>Recent Threads</h3>}
          <button
            onClick={() => setSidebarCollapsed(c => !c)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', padding: '4px', borderRadius: '8px', transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {sidebarCollapsed ? 'last_page' : 'first_page'}
            </span>
          </button>
        </div>

        {!sidebarCollapsed && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {savedSessions.length === 0 && (
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: '16px', opacity: 0.6 }}>No past conversations yet</p>
              )}
              {savedSessions.map((session: any) => {
                const sId = session._id || session.id;
                return (
                <div
                  key={sId}
                  onClick={() => loadSession(session)}
                  className="glass-panel interactive"
                  style={{
                    padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                    background: sessionId === sId ? 'rgba(255,255,255,0.05)' : 'transparent',
                    border: sessionId === sId ? '1px solid var(--color-accent)' : '1px solid transparent',
                    position: 'relative'
                  }}
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sessionId === sId ? 'var(--color-accent)' : 'transparent', border: sessionId === sId ? 'none' : '1px solid var(--color-text-secondary)', flexShrink: 0 }}></div>
                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.title}</p>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{new Date(session.updatedAt || session.createdAt || Date.now()).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={(e) => deleteSession(e, sId)}
                    className="btn btn-glass"
                    style={{ padding: '4px', border: 'none', background: 'transparent', color: 'var(--color-text-secondary)' }}
                    title="Delete Thread"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', display: 'flex' }}>delete</span>
                  </button>
                </div>
              )})}
            </div>

            <button
              className="btn btn-glass"
              style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
              onClick={clearSession}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              New Conversation
            </button>
          </>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="glass-panel" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
        
        {/* Chat Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '28px' }}>auto_awesome</span>
             <div>
               <h2 style={{ fontSize: '20px' }}>AI Operations Assistant</h2>
               <span className="text-metadata text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span> 
                  RBAC Secured Streaming Session • Role: {role}
               </span>
             </div>
           </div>
           <button className="btn btn-glass" onClick={clearSession}>
             <span className="material-symbols-outlined">clear_all</span>
           </button>
        </div>

        {/* Chat Feed */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {messages.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', opacity: 0.6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', color: 'var(--color-accent)' }}>auto_awesome</span>
              <h3>How can I help you today?</h3>
              <p style={{ maxWidth: '300px', margin: '8px auto', fontSize: '14px' }}>Ask a question or select a quick prompt below to get started.</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: msg.sender === 'user' ? '70%' : '85%' }}>
              
              {msg.sender === 'user' ? (
                <>
                  <div className="glass-cutout" style={{ padding: '16px 20px', borderRadius: '20px 20px 0 20px', background: 'var(--color-accent)', color: '#fff', border: 'none' }}>
                    <p style={{ fontSize: '15px', lineHeight: 1.5 }}>{msg.text}</p>
                  </div>
                  <span className="text-secondary" style={{ fontSize: '11px', display: 'block', textAlign: 'right', marginTop: '6px' }}>{msg.time}</span>
                </>
              ) : (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--cutout-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--glass-border-light)' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '20px' }}>auto_awesome</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="ai-markdown-content" style={{ padding: '16px 0', fontSize: '15px', lineHeight: 1.6 }}>
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                    {msg.widgets && msg.widgets.map((w: any, wIdx: number) => renderWidget(w.type, w.payload, wIdx))}
                    {(msg.text || msg.widgets?.length > 0) && (
                      <span className="text-secondary" style={{ fontSize: '11px', display: 'block', marginTop: '12px' }}>{msg.time} • Action rendered via AI Microservice</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--cutout-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--glass-border-light)' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '20px' }}>auto_awesome</span>
                </div>
                <div style={{ padding: '16px 0', display: 'flex', gap: '4px' }}>
                  <div style={{ width: '6px', height: '6px', background: 'var(--color-text-secondary)', borderRadius: '50%', animation: 'skeletonPulse 1s infinite alternate' }}></div>
                  <div style={{ width: '6px', height: '6px', background: 'var(--color-text-secondary)', borderRadius: '50%', animation: 'skeletonPulse 1s infinite alternate 0.2s' }}></div>
                  <div style={{ width: '6px', height: '6px', background: 'var(--color-text-secondary)', borderRadius: '50%', animation: 'skeletonPulse 1s infinite alternate 0.4s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '24px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          {/* Quick Prompts */}
          {quickPrompts.length > 0 && messages.length === 0 && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px', flexWrap: 'wrap' }}>
              {quickPrompts.map((prompt, idx) => (
                <button 
                  key={idx} 
                  className="btn btn-glass" 
                  style={{ whiteSpace: 'nowrap', fontSize: '12px', padding: '6px 12px', borderRadius: '16px', background: 'var(--color-glass-surface)', color: 'var(--color-ui-element)' }}
                  onClick={() => handleSend(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <div className="glass-cutout" style={{ display: 'flex', alignItems: 'flex-end', padding: '12px', borderRadius: '16px', flexDirection: 'column', gap: '8px' }}>
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setAttachedFile(file);
                  showToast('File attached', 'success', file.name);
                }
                // Reset so same file can be re-attached
                e.target.value = '';
              }}
            />
            {/* Attached file preview chip */}
            {attachedFile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '8px', padding: '4px 12px', fontSize: '12px', color: '#38bdf8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>description</span>
                <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachedFile.name}</span>
                <button onClick={() => setAttachedFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#38bdf8', padding: 0, display: 'flex', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                </button>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%', gap: '4px' }}>
              <button
                className="btn btn-glass"
                style={{ padding: '8px', borderRadius: '50%', border: 'none', background: 'transparent' }}
                onClick={() => fileInputRef.current?.click()}
                title="Attach file"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>attach_file</span>
              </button>
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask the AI to perform an action..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                minHeight: '44px',
                maxHeight: '120px',
                padding: '12px',
                fontSize: '15px',
                fontFamily: 'inherit',
                color: 'var(--color-ui-element)'
              }}
            />
              <button 
                className="btn btn-primary" 
                style={{ padding: '10px', borderRadius: '12px', opacity: (inputText.trim() || attachedFile) ? 1 : 0.5 }}
                onClick={() => handleSend()}
                disabled={!inputText.trim() && !attachedFile}
              >
                 <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>send</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
