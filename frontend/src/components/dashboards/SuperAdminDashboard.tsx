import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsageColor } from '../../utils';
import { apiClient } from '../../api/client';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const platformActivityData = [
  { time: 'Mon', requests: 1200 },
  { time: 'Tue', requests: 1800 },
  { time: 'Wed', requests: 1600 },
  { time: 'Thu', requests: 2200 },
  { time: 'Fri', requests: 2800 },
  { time: 'Sat', requests: 900 },
  { time: 'Sun', requests: 1100 }
];

const tenantGrowthData = [
  { quarter: 'Q1', tenants: 12 },
  { quarter: 'Q2', tenants: 18 },
  { quarter: 'Q3', tenants: 24 },
  { quarter: 'Q4', tenants: 35 }
];

export default function SuperAdminDashboard({ isAiActive, setIsAiActive, user }: { isAiActive: boolean, setIsAiActive: (val: boolean) => void, user?: any }) {
  const navigate = useNavigate();
  const roleSlug = 'superadmin';
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [aiQuery, setAiQuery] = useState('');

  const handleAiSubmit = () => {
    if (aiQuery.trim()) {
      navigate(`/ai-assistant/${roleSlug}`, { state: { initialQuery: aiQuery } });
    }
  };

  useEffect(() => {
    fetchPendingUsers();
    fetchRoles();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const res = await apiClient.get('/users/pending');
      setPendingUsers(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch pending users', err);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await apiClient.get('/roles');
      const fetchedRoles = res.data.data || [];
      setRoles(fetchedRoles);
      
      // Set default role for all pending users if not selected yet
      if (fetchedRoles.length > 0) {
        const defaultRole = fetchedRoles.find((r: any) => r.name === 'Standard Employee') || fetchedRoles[0];
        setSelectedRoles(prev => {
          const updated = { ...prev };
          // This will be populated when pending users are loaded, 
          // or we handle it in handleRoleSelect dynamically
          return updated;
        });
      }
    } catch (err) {
      console.error('Failed to fetch roles', err);
    }
  };

  const handleRoleSelect = (userId: string, roleId: string) => {
    setSelectedRoles(prev => ({ ...prev, [userId]: roleId }));
  };

  const handleApprove = async (userId: string) => {
    try {
      let roleId = selectedRoles[userId];
      if (!roleId) {
        const defaultRole = roles.find(r => r.name === 'Standard Employee') || roles[0];
        if (!defaultRole) return alert('No roles available to assign');
        roleId = defaultRole._id;
      }
      
      await apiClient.post(`/users/${userId}/approve`, { roleId });
      fetchPendingUsers();
    } catch (err) {
      console.error('Failed to approve user', err);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await apiClient.post(`/users/${userId}/reject`);
      fetchPendingUsers();
    } catch (err) {
      console.error('Failed to reject user', err);
    }
  };

  const exportAuditLogsToCSV = () => {
    const logs = [
      { time: '10:42:01', event: 'AUTH_SUCCESS', description: "User 'admin@nexusops.com' authenticated." },
      { time: '10:35:12', event: 'RBAC_VIOLATION', description: "User 'emp_402' attempted to access /api/payroll/run." },
      { time: '09:15:00', event: 'TENANT_CREATED', description: "New organization 'Acme Corp' provisioned." }
    ];
    
    let csvContent = "data:text/csv;charset=utf-8,Time,Event,Description\n";
    logs.forEach(log => {
      csvContent += `${log.time},${log.event},"${log.description}"\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `security_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="grid-12">
      <div style={{ gridColumn: 'span 8' }}>
        
        {/* Central AI Greeting */}
        <section className="glass-panel" style={{ padding: '40px', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>Global Overview, {user?.firstName || 'Super Admin'}.</h1>
          <p className="text-secondary" style={{ fontSize: '16px', marginBottom: '32px', maxWidth: '600px', lineHeight: 1.6 }}>
            The platform is serving 4 active enterprise tenants. API latency is currently at 120ms. AI Operations Assistant token usage has increased by 15% this week.
          </p>
          
          <div className="glass-cutout" style={{ padding: '8px', display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ margin: '0 12px', color: 'var(--color-accent)' }}>auto_awesome</span>
            <input 
              type="text" 
              placeholder="Ask AI (e.g. 'Generate a global compliance audit report')..." 
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '15px', color: 'var(--color-primary)', fontFamily: 'inherit' }}
              onFocus={() => setIsAiActive(true)}
            onBlur={() => setIsAiActive(false)}
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()}
            />
            <button className="btn btn-primary" style={{ borderRadius: '10px' }} onClick={handleAiSubmit}><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span></button>
          </div>
        </section>

        {/* Quick Actions Matrix */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          <div className="glass-panel interactive animate-fade-in-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '0.2s' }}>
             <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--color-blob-1)' }}>domain</span>
             <div>
               <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>Organizations</h3>
               <p className="text-secondary" style={{ fontSize: '14px' }}>Configure tenants and SSO</p>
             </div>
             <button onClick={() => navigate(`/employees/${roleSlug}`)} className="btn btn-glass" style={{ width: '100%', marginTop: 'auto' }}>Manage Tenants</button>
          </div>

          <div className="glass-panel interactive animate-fade-in-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '0.3s' }}>
             <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--color-blob-2)' }}>policy</span>
             <div>
               <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>Global Policies</h3>
               <p className="text-secondary" style={{ fontSize: '14px' }}>2 compliance updates needed</p>
             </div>
             <button onClick={() => navigate(`/documents/${roleSlug}`)} className="btn btn-glass" style={{ width: '100%', marginTop: 'auto' }}>Edit Policies</button>
          </div>

          <div className="glass-panel interactive animate-fade-in-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '0.4s' }}>
             <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--color-blob-3)' }}>history</span>
             <div>
               <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>System Logs</h3>
               <p className="text-secondary" style={{ fontSize: '14px' }}>1.2M events indexed</p>
             </div>
             <button onClick={() => navigate(`/notifications/${roleSlug}`)} className="btn btn-glass" style={{ width: '100%', marginTop: 'auto' }}>View Audit Logs</button>
          </div>
        </section>

        {/* Global Analytics Charts */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginTop: '24px' }}>
          {/* Platform Activity (Area Chart) */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px' }}>Platform Activity (Requests/s)</h3>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)' }}>ssid_chart</span>
            </div>
            
            <div style={{ height: '220px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={platformActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--color-background-base)', borderRadius: '12px', border: '1px solid var(--glass-border-light)', boxShadow: '0 8px 32px var(--glass-shadow)', backdropFilter: 'blur(10px)' }}
                  />
                  <Area type="monotone" dataKey="requests" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRequests)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tenant Growth (Bar Chart) */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px' }}>Active Tenants Growth</h3>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)' }}>business</span>
            </div>
            
            <div style={{ height: '220px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tenantGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="quarter" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--color-background-base)', borderRadius: '12px', border: '1px solid var(--glass-border-light)', boxShadow: '0 8px 32px var(--glass-shadow)', backdropFilter: 'blur(10px)' }}
                    cursor={{ fill: 'var(--cutout-bg)' }}
                  />
                  <Bar dataKey="tenants" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Enrichment: System Audit Log (M-01) and API Health (M-15) */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginTop: '24px' }}>
          
          {/* System Audit Log (M-01) */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px' }}>Security Audit Log</h3>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)' }}>policy</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: 'monospace', fontSize: '12px' }}>
              <div style={{ padding: '8px 12px', background: 'var(--cutout-bg)', borderRadius: '6px', borderLeft: '3px solid var(--color-blob-1)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>[10:42:01] </span>
                <span style={{ color: 'var(--color-blob-1)' }}>AUTH_SUCCESS</span>
                <span> - User 'admin@nexusops.com' authenticated.</span>
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--cutout-bg)', borderRadius: '6px', borderLeft: '3px solid #ef4444' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>[10:35:12] </span>
                <span style={{ color: '#ef4444' }}>RBAC_VIOLATION</span>
                <span> - User 'emp_402' attempted to access /api/payroll/run.</span>
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--cutout-bg)', borderRadius: '6px', borderLeft: '3px solid #10b981' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>[09:15:00] </span>
                <span style={{ color: '#10b981' }}>TENANT_CREATED</span>
                <span> - New organization 'Acme Corp' provisioned.</span>
              </div>
            </div>
            <button className="btn btn-glass" onClick={exportAuditLogsToCSV} style={{ width: '100%', marginTop: 'auto', fontSize: '12px', padding: '6px' }}>Export CSV</button>
          </div>

          {/* API Health (M-15) */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px' }}>API Health & Latency</h3>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)' }}>monitor_heart</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 500 }}>Core Monolith API</p>
                  <p style={{ fontSize: '13px', color: getUsageColor(15) }}>24ms (Healthy)</p>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--cutout-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '15%', height: '100%', background: getUsageColor(15) }}></div>
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 500 }}>AI Co-Pilot Gateway</p>
                  <p style={{ fontSize: '13px', color: getUsageColor(60) }}>450ms (High Load)</p>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--cutout-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '60%', height: '100%', background: getUsageColor(60) }}></div>
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 500 }}>Database Shards</p>
                  <p style={{ fontSize: '13px', color: getUsageColor(10) }}>12ms (Optimal)</p>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--cutout-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '10%', height: '100%', background: getUsageColor(10) }}></div>
                </div>
              </div>
            </div>
          </div>

        </section>
      </div>

      {/* Right Panel */}
      <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span className="text-metadata">Platform Headcount</span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-text-secondary)' }}>more_horiz</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <h2 style={{ fontSize: '48px', lineHeight: 1 }}>12.4k</h2>
            <span style={{ color: 'var(--color-accent)', fontWeight: 500, fontSize: '14px' }}>Users</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span className="text-metadata">Pending Approvals</span>
            <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>{pendingUsers.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pendingUsers.length === 0 ? (
              <p className="text-secondary" style={{ fontSize: '13px' }}>No pending signups.</p>
            ) : (
              pendingUsers.map(u => (
                <div key={u._id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '12px', borderBottom: '1px solid var(--cutout-border)' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--cutout-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 600 }}>{u.firstName} {u.lastName}</p>
                        <p className="text-secondary" style={{ fontSize: '12px' }}>{u.email}</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <select
                      value={selectedRoles[u._id] || (roles.find(r => r.name === 'Standard Employee')?._id || '')}
                      onChange={(e) => handleRoleSelect(u._id, e.target.value)}
                      style={{ flex: 1, padding: '6px', fontSize: '12px', borderRadius: '6px', background: 'var(--cutout-bg)', border: '1px solid var(--glass-border-light)', color: 'var(--color-ui-element)' }}
                    >
                      <option value="" disabled>Select Role</option>
                      {roles.map(r => (
                        <option key={r._id} value={r._id}>{r.name}</option>
                      ))}
                    </select>
                    <button onClick={() => handleApprove(u._id)} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}>Approve</button>
                    <button onClick={() => handleReject(u._id)} className="btn btn-glass" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', color: '#ef4444' }}>Reject</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span className="text-metadata">Global Action Feed</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-glass-surface)', border: '1px solid var(--color-blob-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-primary)' }}>rocket_launch</span>
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>New Tenant Provisioned</p>
                <p className="text-secondary" style={{ fontSize: '13px' }}>Acme Corp • 5 mins ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
