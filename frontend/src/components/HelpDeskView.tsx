import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useToast } from './ToastProvider';

export default function HelpDeskView({ role, user }: { role: string, user?: any }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'my_tickets' | 'new_ticket' | 'view_ticket'>('my_tickets');
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminFilter, setAdminFilter] = useState<'OPEN' | 'MY' | 'CLOSED'>('OPEN');
  const [replyText, setReplyText] = useState('');
  const [newTicket, setNewTicket] = useState({
    category: 'IT Hardware / Software',
    subject: '',
    description: ''
  });

  const fetchTickets = async () => {
    try {
      const res = await apiClient.get('/tickets');
      setTickets(Array.isArray(res.data?.data) ? res.data.data : res.data?.data?.items || []);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
      setTickets([]);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSubmitTicket = async () => {
    if (!newTicket.subject || !newTicket.description) {
      showToast('Validation Error', 'error', 'Please fill in all required fields.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await apiClient.post('/tickets', {
        subject: newTicket.subject,
        description: newTicket.description,
        category: newTicket.category,
        priority: 'MEDIUM'
      });
      showToast('Success', 'success', 'Support ticket submitted successfully!');
      setNewTicket({ category: 'IT Hardware / Software', subject: '', description: '' });
      setActiveTab('my_tickets');
      fetchTickets();
    } catch (err: any) {
      console.error(err);
      showToast('Error', 'error', err.response?.data?.error || 'Failed to submit ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    try {
      const endpoint = isAdminView ? `/tickets/${selectedTicket}/agent-messages` : `/tickets/${selectedTicket}/messages`;
      await apiClient.post(endpoint, { message: replyText });
      setReplyText('');
      fetchTickets();
    } catch (err: any) {
      showToast('Error', 'error', 'Failed to send reply');
    }
  };

  const handleResolve = async () => {
    if (!selectedTicket) return;
    try {
      await apiClient.patch(`/tickets/${selectedTicket}/status`, { status: 'CLOSED' });
      showToast('Success', 'success', 'Ticket resolved');
      fetchTickets();
    } catch (err: any) {
      showToast('Error', 'error', 'Failed to resolve ticket');
    }
  };

  const getMessages = (ticketId: string | null) => {
    if (!ticketId) return [];
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket || !ticket.history) return [];
    return ticket.history.map((h: any, i: number) => ({
      id: i,
      sender: h.sender,
      isAgent: h.sender === 'IT Support' || h.sender === 'HR Support',
      text: h.message,
      time: i === 0 ? ticket.updated : 'Later'
    }));
  };

  const isAdminView = role === 'Administrator' || role === 'IT Admin' || role === 'Super Admin' || role === 'HR Manager';

  const renderPriority = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return <span style={{ padding: '4px 8px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '10px', fontWeight: 700, borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>CRITICAL</span>;
      case 'HIGH': return <span style={{ padding: '4px 8px', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', fontSize: '10px', fontWeight: 700, borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>HIGH</span>;
      case 'MEDIUM': return <span style={{ padding: '4px 8px', background: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8', fontSize: '10px', fontWeight: 700, borderRadius: '4px', border: '1px solid rgba(14, 165, 233, 0.3)' }}>MEDIUM</span>;
      case 'LOW': return <span style={{ padding: '4px 8px', background: 'rgba(167, 139, 250, 0.2)', color: '#a78bfa', fontSize: '10px', fontWeight: 700, borderRadius: '4px', border: '1px solid rgba(167, 139, 250, 0.3)' }}>LOW</span>;
      default: return null;
    }
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case 'OPEN': return <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '12px', fontWeight: 600 }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></div>Open</span>;
      case 'IN_PROGRESS': return <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontSize: '12px', fontWeight: 600 }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }}></div>In Progress</span>;
      case 'CLOSED': return <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '12px', fontWeight: 600 }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>Closed</span>;
      default: return null;
    }
  };

  // ─── ADMIN / AGENT VIEW ──────────────────────────────────────────────────
  if (isAdminView) {
    return (
      <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 120px)' }}>
        
        {/* Left Column: Ticket Queue */}
        <div style={{ flex: '0 0 400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Support Queue</h2>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button onClick={() => setAdminFilter('OPEN')} className={`btn ${adminFilter === 'OPEN' ? 'btn-primary' : 'btn-glass'}`} style={{ flex: 1, padding: '8px', fontSize: '12px' }}>Open</button>
              <button onClick={() => setAdminFilter('MY')} className={`btn ${adminFilter === 'MY' ? 'btn-primary' : 'btn-glass'}`} style={{ flex: 1, padding: '8px', fontSize: '12px' }}>My Tickets</button>
              <button onClick={() => setAdminFilter('CLOSED')} className={`btn ${adminFilter === 'CLOSED' ? 'btn-primary' : 'btn-glass'}`} style={{ flex: 1, padding: '8px', fontSize: '12px' }}>Closed</button>
            </div>
            
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '18px', color: 'var(--color-text-secondary)' }}>search</span>
              <input type="text" placeholder="Search tickets..." style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '8px', color: 'inherit', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: 'calc(100vh - 350px)', paddingRight: '8px' }}>
              {tickets.filter(t => {
                if (adminFilter === 'OPEN') return t.status !== 'CLOSED';
                if (adminFilter === 'CLOSED') return t.status === 'CLOSED';
                if (adminFilter === 'MY') return t.assignedTo?.id === user?.id || t.assignedTo?._id === user?.id || (user?.id && JSON.stringify(t.assignedTo).includes(user.id));
                return true;
              }).length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No tickets found in queue.</div>
              )}
              {tickets.filter(t => {
                if (adminFilter === 'OPEN') return t.status !== 'CLOSED';
                if (adminFilter === 'CLOSED') return t.status === 'CLOSED';
                if (adminFilter === 'MY') return t.assignedTo?.id === user?.id || t.assignedTo?._id === user?.id || (user?.id && JSON.stringify(t.assignedTo).includes(user.id));
                return true;
              }).map(ticket => (
                <div 
                  key={ticket.id} 
                  className={`glass-cutout interactive hover-bg ${selectedTicket === ticket.id ? 'active' : ''}`}
                  onClick={() => setSelectedTicket(ticket.id)}
                  style={{ 
                    padding: '16px', 
                    cursor: 'pointer', 
                    borderLeft: selectedTicket === ticket.id ? '3px solid var(--color-primary)' : '3px solid transparent',
                    background: selectedTicket === ticket.id ? 'var(--color-glass-surface)' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>{ticket.id}</span>
                    {renderPriority(ticket.priority)}
                  </div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', lineHeight: 1.4 }}>{ticket.subject}</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{ticket.requester}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: ticket.priority === 'CRITICAL' ? '#ef4444' : 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>timer</span> {ticket.sla}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Ticket Details & Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedTicket ? (
            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '24px', borderBottom: '1px solid var(--cutout-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    {renderStatus('OPEN')}
                    <span style={{ width: '1px', height: '12px', background: 'var(--cutout-bg)' }}></span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>IT Support</span>
                  </div>
                  <h2 style={{ fontSize: '20px', margin: '0 0 8px 0' }}>{tickets.find(t => t.id === selectedTicket)?.subject}</h2>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    <span><strong style={{ color: 'var(--color-text)' }}>Status:</strong> {tickets.find(t => t.id === selectedTicket)?.status}</span>
                    <span><strong style={{ color: 'var(--color-text)' }}>Agent:</strong> {tickets.find(t => t.id === selectedTicket)?.agent}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                   <button onClick={async () => {
                     const newAssignee = prompt("Enter the User ID or email of the new assignee:");
                     if (newAssignee) {
                       try {
                         await apiClient.patch(`/tickets/${selectedTicket}/assign`, { assignedTo: newAssignee });
                         showToast('Success', 'success', 'Ticket reassigned successfully.');
                         fetchTickets();
                       } catch (e) { showToast('Error', 'error', 'Failed to reassign.'); }
                     }
                   }} className="btn btn-glass" style={{ padding: '8px 16px', fontSize: '13px' }}>Reassign</button>
                   <button onClick={handleResolve} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>Resolve Ticket</button>
                </div>
              </div>

              {/* Chat Thread */}
              <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(0,0,0,0.02)' }}>
                {getMessages(selectedTicket).map((msg: any) => (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.isAgent ? 'flex-end' : 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: msg.isAgent ? 'var(--color-primary)' : 'var(--color-text)' }}>{msg.sender}</span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{msg.time}</span>
                    </div>
                    <div style={{ 
                      padding: '12px 16px', 
                      borderRadius: '12px', 
                      background: msg.sender === 'System' ? 'var(--cutout-bg)' : msg.isAgent ? 'var(--color-blob-1)' : 'var(--color-glass-surface)',
                      border: msg.isAgent ? 'none' : '1px solid var(--cutout-bg)',
                      maxWidth: '80%',
                      fontSize: '14px',
                      lineHeight: 1.5,
                      color: msg.sender === 'System' ? 'var(--color-text-secondary)' : 'inherit',
                      fontStyle: msg.sender === 'System' ? 'italic' : 'normal'
                    }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <div style={{ padding: '24px', borderTop: '1px solid var(--cutout-bg)' }}>
                <div style={{ background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '12px', overflow: 'hidden' }}>
                  <textarea 
                    placeholder="Type your reply here..." 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        handleReply();
                      }
                    }}
                    style={{ width: '100%', height: '100px', padding: '16px', background: 'transparent', border: 'none', color: 'inherit', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                  ></textarea>
                  <div style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--cutout-bg)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Press <kbd style={{ background: 'var(--cutout-bg)', padding: '2px 4px', borderRadius: '4px' }}>Cmd + Enter</kbd> to send</span>
                    <button onClick={handleReply} className="btn btn-primary" style={{ padding: '8px 24px' }}>Send Reply</button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>forum</span>
              <p>Select a ticket from the queue to view details and reply.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── EMPLOYEE VIEW ───────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>Help Desk</h2>
          <p className="text-secondary" style={{ fontSize: '14px' }}>Module M-11: Employee Support & Ticketing</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className={`btn ${activeTab === 'my_tickets' || activeTab === 'view_ticket' ? 'btn-primary' : 'btn-glass'}`} 
            onClick={() => {
              setActiveTab('my_tickets');
              setSelectedTicket(null);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>list_alt</span> My Tickets
          </button>
          <button 
            className={`btn ${activeTab === 'new_ticket' ? 'btn-primary' : 'btn-glass'}`} 
            onClick={() => {
              setActiveTab('new_ticket');
              setSelectedTicket(null);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span> New Ticket
          </button>
        </div>
      </div>

      {activeTab === 'my_tickets' ? (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--cutout-bg)', color: 'var(--color-text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Ticket</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Subject</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Last Updated</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No tickets found.</td>
                </tr>
              )}
              {tickets.filter(t => {
                if (user) {
                  const fullName = `${user.firstName} ${user.lastName}`;
                  return t.requester === fullName;
                }
                return t.requester === 'Sarah Jenkins' || t.requester === 'Priya Sharma';
              }).map(ticket => (
                <tr key={ticket.id} style={{ borderBottom: '1px solid var(--cutout-bg)', transition: 'background 0.2s ease' }} className="hover-bg">
                  <td style={{ padding: '16px', fontSize: '13px', fontWeight: 600 }}>{ticket.id}</td>
                  <td style={{ padding: '16px', fontSize: '14px' }}>{ticket.subject}</td>
                  <td style={{ padding: '16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{ticket.category}</td>
                  <td style={{ padding: '16px' }}>{renderStatus(ticket.status)}</td>
                  <td style={{ padding: '16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{ticket.updated}</td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button onClick={() => {
                      setSelectedTicket(ticket.id);
                      setActiveTab('view_ticket');
                    }} className="btn btn-glass" style={{ padding: '6px 12px', fontSize: '12px' }}>View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'view_ticket' && selectedTicket ? (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '600px', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '24px', borderBottom: '1px solid var(--cutout-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                {renderStatus(tickets.find(t => t.id === selectedTicket)?.status || 'OPEN')}
              </div>
              <h2 style={{ fontSize: '20px', margin: '0 0 8px 0' }}>{tickets.find(t => t.id === selectedTicket)?.subject}</h2>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <span><strong style={{ color: 'var(--color-text)' }}>Ticket ID:</strong> {selectedTicket}</span>
                <span><strong style={{ color: 'var(--color-text)' }}>Category:</strong> {tickets.find(t => t.id === selectedTicket)?.category}</span>
              </div>
            </div>
            <button onClick={() => { setActiveTab('my_tickets'); setSelectedTicket(null); }} className="btn btn-glass" style={{ padding: '8px 16px', fontSize: '13px' }}>Back to List</button>
          </div>

          {/* Chat Thread */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(0,0,0,0.02)' }}>
            {getMessages(selectedTicket).map((msg: any) => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: !msg.isAgent ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: !msg.isAgent ? 'var(--color-primary)' : 'var(--color-text)' }}>{msg.sender}</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{msg.time}</span>
                </div>
                <div style={{ 
                  padding: '12px 16px', 
                  borderRadius: '12px', 
                  background: msg.sender === 'System' ? 'var(--cutout-bg)' : !msg.isAgent ? 'var(--color-blob-1)' : 'var(--color-glass-surface)',
                  border: !msg.isAgent ? 'none' : '1px solid var(--cutout-bg)',
                  maxWidth: '80%',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  color: msg.sender === 'System' ? 'var(--color-text-secondary)' : 'inherit',
                  fontStyle: msg.sender === 'System' ? 'italic' : 'normal'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Reply Box */}
          <div style={{ padding: '24px', borderTop: '1px solid var(--cutout-bg)' }}>
            <div style={{ background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '12px', overflow: 'hidden' }}>
              <textarea 
                placeholder="Type your reply here..." 
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleReply();
                  }
                }}
                style={{ width: '100%', height: '80px', padding: '16px', background: 'transparent', border: 'none', color: 'inherit', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
              ></textarea>
              <div style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--cutout-bg)' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Press <kbd style={{ background: 'var(--cutout-bg)', padding: '2px 4px', borderRadius: '4px' }}>Cmd + Enter</kbd> to send</span>
                <button onClick={handleReply} className="btn btn-primary" style={{ padding: '8px 24px' }}>Send Reply</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid-12">
          <div className="glass-panel" style={{ gridColumn: 'span 8', padding: '32px' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>Submit a Support Request</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Category</label>
                <select 
                  value={newTicket.category}
                  onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '8px', color: 'inherit', outline: 'none', fontFamily: 'inherit' }}
                >
                  <option>IT Hardware / Software</option>
                  <option>HR & Policies</option>
                  <option>Payroll & Taxes</option>
                  <option>Facilities & Infrastructure</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Subject</label>
                <input 
                  type="text" 
                  placeholder="Brief summary of the issue" 
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '8px', color: 'inherit', outline: 'none' }} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Description</label>
                <textarea 
                  placeholder="Provide detailed information to help us resolve your issue faster..." 
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  style={{ width: '100%', height: '150px', padding: '16px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '8px', color: 'inherit', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                ></textarea>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Attachments</label>
                <div style={{ width: '100%', padding: '32px', background: 'rgba(0,0,0,0.02)', border: '2px dashed var(--cutout-bg)', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>cloud_upload</span>
                  <p style={{ margin: 0, fontSize: '14px' }}>Drag and drop files here or click to browse</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>Supports JPG, PNG, PDF (Max 10MB)</p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button className="btn btn-glass" onClick={() => setActiveTab('my_tickets')} style={{ padding: '10px 24px' }}>Cancel</button>
                <button onClick={handleSubmitTicket} disabled={isSubmitting} className="btn btn-primary" style={{ padding: '10px 24px', opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '32px', background: 'var(--color-glass-surface)' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-ui-element)' }}>info</span>
              Support Guidelines
            </h3>
            <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: 1.6, color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li><strong>Check the AI Assistant first:</strong> Many policy and software questions can be answered instantly by the copilot.</li>
              <li><strong>Be specific:</strong> Include error codes, times, and exact steps to reproduce the issue.</li>
              <li><strong>SLAs:</strong> Critical IT issues are guaranteed a 2-hour response time. Standard requests may take up to 48 hours.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
