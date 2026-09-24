import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useToast } from './ToastProvider';

interface NotificationsViewProps {
  role: string;
  user?: any;
}

type Priority = 'info' | 'success' | 'warning' | 'critical';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  priority: Priority;
  roles: string[];
  channel: 'in-app' | 'email' | 'sms';
  read: boolean;
}

const priorityConfig = {
  info: { color: '#38bdf8', icon: 'info', bg: 'rgba(56, 189, 248, 0.1)' },
  success: { color: '#10b981', icon: 'check_circle', bg: 'rgba(16, 185, 129, 0.1)' },
  warning: { color: '#f59e0b', icon: 'warning', bg: 'rgba(245, 158, 11, 0.1)' },
  critical: { color: '#ef4444', icon: 'error', bg: 'rgba(239, 68, 68, 0.1)' }
};

const NotificationsView: React.FC<NotificationsViewProps> = ({ role }) => {
  const [settings, setSettings] = useState({
    push: true,
    email: true,
    sms: role === 'IT Admin' || role === 'Super Admin' || role === 'Finance Executive' || role === 'Administrator',
    digest: 'Daily'
  });

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const [myNotifications, setMyNotifications] = useState<Notification[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await apiClient.get('/notifications/my');
        if (res.data?.data) {
          setMyNotifications(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load notifications', err);
      }
    };
    
    // Initial fetch
    fetchNotifications();
    
    // Poll every 30 seconds for real-time feel
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (ids: string[]) => {
    try {
      await apiClient.post('/notifications/read', { notificationIds: ids });
      setMyNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark read', err);
      showToast('Error', 'error', 'Could not update notification status');
    }
  };

  const handleMarkAllAsRead = () => {
    const unreadIds = myNotifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length > 0) {
      handleMarkAsRead(unreadIds);
      showToast('Success', 'success', 'All notifications marked as read');
    }
  };

  const displayedNotifications = activeTab === 'unread' 
    ? myNotifications.filter(n => !n.read) 
    : myNotifications;

  const toggleSetting = (key: keyof typeof settings) => {
    if (key === 'digest') return; // Handled by select
    setSettings(prev => ({ ...prev, [key]: !prev[key as 'push' | 'email' | 'sms'] }));
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <header style={{ marginBottom: '32px' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', letterSpacing: '-1px' }}>Global Notification Center</h1>
          <p style={{ margin: 0, opacity: 0.7, fontSize: '16px' }}>Manage your alerts, messages, and delivery preferences.</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '32px' }}>
          
          {/* Left Column: Settings & Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Filters */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-ui-element)' }}>filter_list</span>
                Views
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  onClick={() => setActiveTab('all')}
                  style={{ padding: '12px 16px', background: activeTab === 'all' ? 'var(--nav-active-bg)' : 'var(--color-glass-surface)', border: activeTab === 'all' ? '1px solid var(--cutout-border)' : '1px solid var(--cutout-bg)', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', boxShadow: activeTab === 'all' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', color: 'var(--color-text)' }}
                >
                  All Notifications
                </button>
                <button 
                  onClick={() => setActiveTab('unread')}
                  style={{ padding: '12px 16px', background: activeTab === 'unread' ? 'var(--nav-active-bg)' : 'var(--color-glass-surface)', border: activeTab === 'unread' ? '1px solid var(--cutout-border)' : '1px solid var(--cutout-bg)', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: activeTab === 'unread' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', color: 'var(--color-text)' }}
                >
                  Unread
                  <span style={{ background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
                    {myNotifications.filter(n => !n.read).length}
                  </span>
                </button>
              </div>
            </div>

            {/* Delivery Channels */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-ui-element)' }}>campaign</span>
                Delivery Channels
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>smartphone</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Push (In-App)</span>
                  </div>
                  <div 
                    onClick={() => toggleSetting('push')}
                    style={{ width: '40px', height: '24px', background: settings.push ? '#10b981' : 'rgba(0,0,0,0.1)', borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s', boxShadow: settings.push ? '0 2px 8px rgba(16,185,129,0.4)' : 'inset 0 2px 4px rgba(0,0,0,0.1)' }}
                  >
                    <div style={{ position: 'absolute', top: '2px', left: settings.push ? '18px' : '2px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>mail</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Email Alerts</span>
                  </div>
                  <div 
                    onClick={() => toggleSetting('email')}
                    style={{ width: '40px', height: '24px', background: settings.email ? '#10b981' : 'rgba(0,0,0,0.1)', borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s', boxShadow: settings.email ? '0 2px 8px rgba(16,185,129,0.4)' : 'inset 0 2px 4px rgba(0,0,0,0.1)' }}
                  >
                    <div style={{ position: 'absolute', top: '2px', left: settings.email ? '18px' : '2px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>sms</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>SMS (Critical)</span>
                  </div>
                  <div 
                    onClick={() => toggleSetting('sms')}
                    style={{ width: '40px', height: '24px', background: settings.sms ? '#10b981' : 'rgba(0,0,0,0.1)', borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s', boxShadow: settings.sms ? '0 2px 8px rgba(16,185,129,0.4)' : 'inset 0 2px 4px rgba(0,0,0,0.1)' }}
                  >
                    <div style={{ position: 'absolute', top: '2px', left: settings.sms ? '18px' : '2px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></div>
                  </div>
                </div>
              </div>
              
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Email Digest Frequency</label>
                <select 
                  value={settings.digest}
                  onChange={(e) => setSettings(prev => ({ ...prev, digest: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: 'var(--cutout-border)', fontSize: '14px', outline: 'none', color: 'var(--color-text)' }}
                >
                  <option>Immediate</option>
                  <option>Daily</option>
                  <option>Weekly</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Column: Inbox */}
          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>Inbox</h2>
              <button 
                onClick={handleMarkAllAsRead}
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--color-text)' }}>
                Mark all as read
              </button>
            </div>

            {displayedNotifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* Subtle pulsing glow */}
                  <div style={{ position: 'absolute', inset: 0, background: 'var(--color-accent)', filter: 'blur(24px)', opacity: 0.15, borderRadius: '50%', animation: 'skeletonPulse 3s infinite ease-in-out' }}></div>
                  <div style={{ width: '100%', height: '100%', background: 'var(--color-glass-surface)', border: '1px solid var(--glass-border-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, boxShadow: '0 8px 32px var(--glass-shadow)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--color-ui-element)', opacity: 0.8 }}>done_all</span>
                  </div>
                </div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>You're all caught up!</h3>
                <p style={{ margin: '8px 0 24px 0', fontSize: '15px', color: 'var(--color-text-secondary)', maxWidth: '280px', lineHeight: 1.5 }}>
                  No new notifications at this time. Enjoy your clear inbox!
                </p>
                <button className="btn btn-glass" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text)' }} onClick={() => setActiveTab('all')}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
                  Refresh Inbox
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {displayedNotifications.map(notification => {
                  const config = priorityConfig[notification.priority];
                  return (
                    <div 
                      key={notification.id}
                      style={{ 
                        background: notification.read ? 'var(--color-glass-surface)' : 'var(--nav-active-bg)', 
                        border: `1px solid ${notification.read ? 'var(--cutout-bg)' : config.color}`,
                        borderLeft: `4px solid ${config.color}`,
                        borderRadius: '16px', 
                        padding: '20px', 
                        boxShadow: notification.read ? 'none' : `0 8px 24px ${config.bg.replace('0.1', '0.3')}`,
                        display: 'flex',
                        gap: '16px',
                        position: 'relative',
                        transition: 'transform 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
                      onClick={() => {
                        if (!notification.read) {
                          handleMarkAsRead([notification.id]);
                        }
                      }}
                    >
                      {!notification.read && (
                        <div style={{ position: 'absolute', top: '20px', right: '20px', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px rgba(239,68,68,0.8)' }}></div>
                      )}
                      
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: config.bg, color: config.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>{config.icon}</span>
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{notification.title}</h4>
                          <span style={{ fontSize: '11px', opacity: 0.5 }}>• {notification.time}</span>
                        </div>
                        <p style={{ margin: '0 0 12px 0', fontSize: '14px', opacity: 0.8, lineHeight: '1.5' }}>
                          {notification.message}
                        </p>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, padding: '4px 8px', background: 'var(--cutout-bg)', borderRadius: '8px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                              {notification.channel === 'in-app' ? 'smartphone' : notification.channel === 'email' ? 'mail' : 'sms'}
                            </span>
                            {notification.channel.toUpperCase()}
                          </span>
                          
                          {notification.priority === 'critical' && (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444' }}>ACTION REQUIRED</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsView;
