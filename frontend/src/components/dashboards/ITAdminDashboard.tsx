import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AnimatedCounter from '../AnimatedCounter';
import { getUsageColor } from '../../utils';
import { useToast } from '../ToastProvider';
import { apiClient } from '../../api/client';

const uptimeData = [
  { time: '00:00', uptime: 99.9, latency: 120 },
  { time: '04:00', uptime: 100, latency: 85 },
  { time: '08:00', uptime: 99.8, latency: 150 },
  { time: '12:00', uptime: 99.9, latency: 220 },
  { time: '16:00', uptime: 99.7, latency: 310 },
  { time: '20:00', uptime: 99.9, latency: 180 }
];

const usersData = [
  { time: '00:00', users: 45 },
  { time: '04:00', users: 20 },
  { time: '08:00', users: 180 },
  { time: '12:00', users: 412 },
  { time: '16:00', users: 380 },
  { time: '20:00', users: 110 }
];

export default function ITAdminDashboard({ isAiActive, setIsAiActive, user }: { isAiActive: boolean, setIsAiActive: (val: boolean) => void, user?: any }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const roleSlug = 'itadmin';
  const [aiQuery, setAiQuery] = useState('');
  const [activeTickets, setActiveTickets] = useState(24);
  const [pendingProvisioning, setPendingProvisioning] = useState(8);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await apiClient.get('/notifications?limit=3');
        if (res.data?.data?.items) {
          setNotifications(res.data.data.items);
        }
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      }
    };
    fetchNotifications();
  }, []);

  const handleUnreadyFeature = (featureName: string, path: string) => {
    showToast(`${featureName} module is currently in development`, 'info');
    navigate(path);
  };

  const handleAiSubmit = () => {
    if (aiQuery.trim()) {
      navigate(`/ai-assistant/${roleSlug}`, { state: { initialQuery: aiQuery } });
    }
  };

  return (
    <main className="grid-12">
      {/* ================= ROW 1: HEADER & KPI ================= */}
      {/* Central AI Greeting */}
      <section className="glass-panel animate-fade-in-up" style={{ gridColumn: 'span 8', padding: '40px', marginBottom: '24px', animationDelay: '0s' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>System Nominal, {user?.firstName || 'Admin'}.</h1>
        <p className="text-secondary" style={{ fontSize: '16px', marginBottom: '32px', maxWidth: '600px', lineHeight: 1.6 }}>
          There are 5 critical SLA breaches in the helpdesk queue, and 12 laptops are pending reassignment. How can I assist you?
        </p>
        
        <div className="glass-cutout" style={{ padding: '8px', display: 'flex', alignItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ margin: '0 12px', color: 'var(--color-accent)' }}>auto_awesome</span>
          <input 
            type="text" 
            placeholder="Ask AI (e.g. 'Show me unassigned Macbook Pros')..." 
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '15px', color: 'var(--color-ui-element)', fontFamily: 'inherit' }}
            onFocus={() => setIsAiActive(true)}
            onBlur={() => setIsAiActive(false)}
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()}
          />
          <button className="btn btn-primary" style={{ borderRadius: '10px' }} onClick={handleAiSubmit}><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span></button>
        </div>
      </section>

      {/* KPI Lens 1: Network Status */}
      <section className="glass-panel animate-fade-in-up" style={{ gridColumn: 'span 4', padding: '24px', marginBottom: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', animationDelay: '0.1s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span className="text-metadata">Network Status</span>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-accent)' }}>check_circle</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '16px' }}>
          <h2 style={{ fontSize: '48px', lineHeight: 1 }}><AnimatedCounter value={99.9} decimals={1} suffix="%" /></h2>
          <span style={{ color: 'var(--color-accent)', fontWeight: 500, fontSize: '14px' }}>Uptime</span>
        </div>
        <div style={{ height: '80px', width: '100%', marginTop: 'auto' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={uptimeData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSparklineIT" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="uptime" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorSparklineIT)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ================= ROW 2: ACTION ROW ================= */}
      {/* Quick Actions & Modules Matrix */}
      <section style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
        <div className="glass-panel interactive animate-fade-in-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '0.2s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>support_agent</span>
            <div>
              <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>Help Desk</h3>
              <p className="text-secondary" style={{ fontSize: '14px' }}>{activeTickets} active tickets</p>
            </div>
            <button onClick={() => navigate(`/helpdesk/${roleSlug}`)} className="btn btn-glass" style={{ width: '100%', marginTop: 'auto' }}>Triage Tickets</button>
        </div>

        <div className="glass-panel interactive animate-fade-in-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '0.3s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>devices</span>
            <div>
              <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>Assets</h3>
              <p className="text-secondary" style={{ fontSize: '14px' }}>{pendingProvisioning} pending provisioning</p>
            </div>
            <button onClick={() => navigate(`/assets/${roleSlug}`)} className="btn btn-glass" style={{ width: '100%', marginTop: 'auto' }}>Manage Assets</button>
        </div>

        <div className="glass-panel interactive animate-fade-in-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '0.4s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>admin_panel_settings</span>
            <div>
              <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>Access Control</h3>
              <p className="text-secondary" style={{ fontSize: '14px' }}>3 alerts detected</p>
            </div>
            <button onClick={() => navigate(`/org-chart/${roleSlug}`)} className="btn btn-glass" style={{ width: '100%', marginTop: 'auto' }}>Review Access</button>
        </div>
      </section>

      {/* ================= ROW 3: ANALYTICS ROW ================= */}
      {/* System Latency (Line Chart) */}
      <section className="glass-panel animate-fade-in-up" style={{ gridColumn: 'span 8', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', animationDelay: '0.5s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px' }}>System Latency (ms)</h3>
          <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)' }}>speed</span>
        </div>
        
        <div style={{ height: '260px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={uptimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-color)" vertical={false} />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
              <Tooltip 
                contentStyle={{ background: 'var(--color-background-base)', borderRadius: '12px', border: '1px solid var(--glass-border-light)', boxShadow: '0 8px 32px var(--glass-shadow)', backdropFilter: 'blur(10px)' }}
              />
              <Line type="monotone" dataKey="latency" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Action Feed Widget */}
      <section className="glass-panel animate-fade-in-up" style={{ gridColumn: 'span 4', padding: '24px', display: 'flex', flexDirection: 'column', marginBottom: '24px', animationDelay: '0.6s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span className="text-metadata">Action Feed</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          {notifications.length > 0 ? notifications.slice(0, 3).map((notif: any) => (
            <div key={notif._id || notif.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-glass-surface)', border: '1px solid var(--color-blob-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: notif.isRead ? 'var(--color-text-secondary)' : 'var(--color-ui-element)' }}>
                  {notif.type === 'ALERT' ? 'warning' : 'notifications'}
                </span>
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>{notif.title}</p>
                <p className="text-secondary" style={{ fontSize: '13px' }}>{notif.message}</p>
              </div>
            </div>
          )) : (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-glass-surface)', border: '1px solid var(--color-blob-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-ui-element)' }}>warning</span>
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>License Expiry</p>
                <p className="text-secondary" style={{ fontSize: '13px' }}>Adobe Creative Cloud • 3 Days</p>
              </div>
            </div>
          )}
        </div>
        <button onClick={() => navigate(`/notifications/${roleSlug}`)} className="btn btn-glass" style={{ width: '100%', marginTop: '24px' }}>View All Actions</button>
      </section>

      {/* ================= ROW 4: DETAILS ROW ================= */}
      {/* Active Users (Area Chart) */}
      <section className="glass-panel animate-fade-in-up" style={{ gridColumn: 'span 6', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '0.7s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px' }}>Concurrent Users</h3>
          <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)' }}>group</span>
        </div>
        
        <div style={{ height: '240px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={usersData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-color)" vertical={false} />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
              <Tooltip 
                contentStyle={{ background: 'var(--color-background-base)', borderRadius: '12px', border: '1px solid var(--glass-border-light)', boxShadow: '0 8px 32px var(--glass-shadow)', backdropFilter: 'blur(10px)' }}
              />
              <Area type="monotone" dataKey="users" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Stacked Details Column */}
      <div style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Active Help Desk Tickets (M-11) */}
        <section className="glass-panel interactive animate-fade-in-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '0.8s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '18px' }}>Active Helpdesk Tickets</h3>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)' }}>confirmation_number</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#ef4444' }}>[SLA BREACH] VPN Access Denied</p>
                <span style={{ fontSize: '11px', color: '#ef4444' }}>2h Overdue</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Reported by: Liam O'Connor (Engineering)</p>
            </div>
            
            <div className="glass-cutout" style={{ padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <p style={{ fontSize: '14px', fontWeight: 600 }}>Monitor Replacement</p>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>4h Remaining</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Reported by: Sarah Jenkins (HR)</p>
            </div>
          </div>
        </section>

        {/* Asset Allocation (M-10) */}
        <section className="glass-panel interactive animate-fade-in-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, animationDelay: '0.9s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '18px' }}>Asset Allocation</h3>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)' }}>inventory_2</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <p style={{ fontSize: '14px', fontWeight: 500 }}>Laptops Deployed</p>
                <p style={{ fontSize: '13px', color: getUsageColor(92) }}>92% (350/380)</p>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--cutout-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '92%', height: '100%', background: getUsageColor(92) }}></div>
              </div>
              <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>Warning: Inventory critically low. Procurement recommended.</p>
            </div>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <p style={{ fontSize: '14px', fontWeight: 500 }}>Software Licenses</p>
                <p style={{ fontSize: '13px', color: getUsageColor(65) }}>65% (130/200)</p>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--cutout-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '65%', height: '100%', background: getUsageColor(65) }}></div>
              </div>
            </div>
          </div>
        </section>
      </div>

    </main>
  );
}
