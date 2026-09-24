import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const timeOffData = [
  { name: 'Casual', value: 12, color: '#38bdf8' },
  { name: 'Sick', value: 5, color: '#ec4899' },
  { name: 'Used', value: 8, color: '#475569' }
];

export default function EmployeeDashboard({ isAiActive, setIsAiActive, user }: { isAiActive: boolean, setIsAiActive: (val: boolean) => void, user?: any }) {
  const navigate = useNavigate();
  const roleSlug = 'employee';
  const [mounted, setMounted] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [clockedIn, setClockedIn] = useState(false);
  const [shiftCompleted, setShiftCompleted] = useState(false);
  const [clockActionLoading, setClockActionLoading] = useState(false);
  const [timeOffData, setTimeOffData] = useState<{name: string, value: number, color: string}[]>([
    { name: 'Casual', value: 12, color: '#38bdf8' },
    { name: 'Sick', value: 5, color: '#ec4899' },
    { name: 'Used', value: 8, color: '#475569' }
  ]);
  
  const handleAiSubmit = () => {
    if (aiQuery.trim()) {
      navigate(`/ai-assistant/${roleSlug}`, { state: { initialQuery: aiQuery } });
    }
  };

  useEffect(() => {
    setMounted(true);
    const fetchData = async () => {
      try {
        const { apiClient } = await import('../../api/client');
        
        // Fetch Leave Balances safely
        try {
          const res = await apiClient.get('/leave/balances');
          if (res.data?.data?.balances) {
            const balances = res.data.data.balances;
            let casual = 0, sick = 0, earned = 0;
            
            balances.forEach((b: any) => {
              const name = b.policyId?.name?.toLowerCase() || '';
              if (name.includes('casual')) casual += b.balance;
              else if (name.includes('sick')) sick += b.balance;
              else earned += b.balance;
            });

            setTimeOffData([
              { name: 'Casual', value: casual || 12, color: '#38bdf8' },
              { name: 'Sick', value: sick || 5, color: '#ec4899' },
              { name: 'Earned', value: earned || 8, color: '#10b981' }
            ]);
          }
        } catch (err) {
          console.warn('Failed to fetch leave balances:', err);
        }

        // Fetch Today's Attendance safely
        try {
          const todayRes = await apiClient.get('/attendance/today');
          if (todayRes?.data?.data) {
             const record = todayRes.data.data;
             if (record) {
               const events = record.attendanceEvents || [];
               const hasClockIn = events.some((e: any) => e.eventType === 'CLOCK_IN');
               const hasClockOut = events.some((e: any) => e.eventType === 'CLOCK_OUT');
               
               if (hasClockIn && !hasClockOut) {
                 setClockedIn(true);
               } else if (hasClockOut) {
                 setClockedIn(false);
                 setShiftCompleted(true);
               }
             }
          }
        } catch (err) {
          console.warn('Failed to fetch attendance today:', err);
        }
      } catch (err) {
        console.error('Failed to initialize dashboard api:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleClockAction = async () => {
    try {
      setClockActionLoading(true);
      const { apiClient } = await import('../../api/client');
      if (clockedIn) {
        await apiClient.post('/attendance/clock-out', { gpsData: { lat: 0, lng: 0 } });
        setClockedIn(false);
        setShiftCompleted(true);
      } else {
        await apiClient.post('/attendance/clock-in', { gpsData: { lat: 0, lng: 0 } });
        setClockedIn(true);
      }
    } catch (err) {
      console.error('Failed to clock in/out', err);
      alert('Failed to register attendance punch');
    } finally {
      setClockActionLoading(false);
    }
  };
  return (
    <main className="grid-12">
      {/* ================= ROW 1: HEADER & KPI ================= */}
      {/* Central AI Greeting */}
      <section className="glass-panel animate-fade-in-up" style={{ gridColumn: 'span 8', padding: '40px', animationDelay: '0s' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>Good morning, {user?.firstName || 'Priya'}.</h1>
        <p className="text-secondary" style={{ fontSize: '16px', marginBottom: '32px', maxWidth: '600px', lineHeight: 1.6 }}>
          Your casual leave request for next Monday has been approved. You have 2 project tasks due this week. How can I assist you today?
        </p>
        
        <div className="glass-cutout" style={{ padding: '8px', display: 'flex', alignItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ margin: '0 12px', color: 'var(--color-accent)' }}>
            auto_awesome
          </span>
          <input 
            type="text" 
            placeholder="Ask the AI Operations Assistant (e.g. 'Apply for sick leave today')..." 
            style={{ 
              flex: 1, 
              background: 'transparent', 
              border: 'none', 
              outline: 'none', 
              fontSize: '15px',
              color: 'var(--color-ui-element)',
              fontFamily: 'inherit'
            }}
            onFocus={() => setIsAiActive(true)}
            onBlur={() => setIsAiActive(false)}
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()}
          />
          <button className="btn btn-primary" style={{ borderRadius: '10px' }} onClick={handleAiSubmit}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
          </button>
        </div>
        {isAiActive && (
            <div style={{ marginTop: '12px', paddingLeft: '48px' }}>
              <span className="text-metadata text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span> 
                RBAC Secured Query
              </span>
            </div>
        )}
      </section>

      {/* KPI Lens 1: Time Off Balance Chart */}
      <section className="glass-panel animate-fade-in-up" style={{ gridColumn: 'span 4', padding: '24px', marginBottom: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', animationDelay: '0.1s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span className="text-metadata">Time Off Balance</span>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-text-secondary)' }}>pie_chart</span>
        </div>
        {loading ? (
          <div style={{ height: '220px', width: '100%', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="skeleton-box" style={{ height: '140px', width: '140px', borderRadius: '50%', margin: '0 auto' }}></div>
            <div className="skeleton-box" style={{ height: '12px', width: '60%', margin: '12px auto 0 auto' }}></div>
            <div className="skeleton-box" style={{ height: '12px', width: '80%', margin: '0 auto' }}></div>
          </div>
        ) : (
          <div style={{ height: '220px', width: '100%', marginTop: 'auto', animation: 'fadeIn 0.5s ease-out' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={timeOffData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={2}
                  cornerRadius={6}
                  dataKey="value"
                  stroke="none"
                >
                  {timeOffData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: 'var(--color-background-base)', borderRadius: '12px', border: '1px solid var(--glass-border-light)', boxShadow: '0 8px 32px var(--glass-shadow)', backdropFilter: 'blur(10px)' }}
                  itemStyle={{ color: 'var(--color-ui-element)', fontWeight: 600 }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ================= ROW 2: ACTION ROW ================= */}
      <section style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        <div className="glass-panel interactive animate-fade-in-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--color-blob-1)', color: '#fff', animationDelay: '0.2s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>schedule</span>
            <div>
              <h3 style={{ fontSize: '24px', marginBottom: '4px' }}>09:00 AM</h3>
              <p style={{ fontSize: '14px', opacity: 0.8 }}>Current Shift</p>
            </div>
            <button 
              disabled={clockActionLoading || shiftCompleted} 
              onClick={handleClockAction} 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: 'auto', padding: '12px', background: shiftCompleted ? 'rgba(255,255,255,0.1)' : clockedIn ? '#ef4444' : 'rgba(255,255,255,0.2)', color: shiftCompleted ? 'rgba(255,255,255,0.5)' : '#fff', border: 'none', opacity: (clockActionLoading || shiftCompleted) ? 0.7 : 1 }}
            >
              {clockActionLoading ? 'Processing...' : shiftCompleted ? 'Shift Completed' : clockedIn ? 'Clock Out' : 'Clock In'}
            </button>
        </div>

        <div className="glass-panel interactive animate-fade-in-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '0.3s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>event_available</span>
            <div>
              <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>Apply Leave</h3>
              <p className="text-secondary" style={{ fontSize: '14px' }}>Balance: 12 Casual, 5 Sick</p>
            </div>
            <button onClick={() => navigate(`/time/${roleSlug}`)} className="btn btn-glass" style={{ width: '100%', marginTop: 'auto' }}>New Request</button>
        </div>

        <div className="glass-panel interactive animate-fade-in-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '0.4s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>receipt_long</span>
            <div>
              <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>Payslips</h3>
              <p className="text-secondary" style={{ fontSize: '14px' }}>Recent available</p>
            </div>
            <button onClick={() => navigate(`/payroll/${roleSlug}`)} className="btn btn-glass" style={{ width: '100%', marginTop: 'auto' }}>View Payslips</button>
        </div>
      </section>

      {/* ================= ROW 3: ANALYTICS & TASKS ================= */}
      {/* Performance Goals (M-08) */}
      <section className="glass-panel animate-fade-in-up" style={{ gridColumn: 'span 8', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '0.5s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px' }}>Q3 Performance Goals</h3>
          <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)' }}>trending_up</span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <p style={{ fontSize: '14px', fontWeight: 500 }}>Migrate Auth to Redis</p>
              <p style={{ fontSize: '13px', color: 'var(--color-blob-1)' }}>80%</p>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--cutout-bg)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: mounted ? '80%' : '0%', height: '100%', background: 'var(--color-blob-1)', transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)' }}></div>
            </div>
          </div>
          
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <p style={{ fontSize: '14px', fontWeight: 500 }}>Complete Security Training</p>
              <p style={{ fontSize: '13px', color: 'var(--color-blob-1)' }}>100%</p>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--cutout-bg)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: mounted ? '100%' : '0%', height: '100%', background: 'var(--color-blob-1)', transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Action Feed Widget */}
      <section className="glass-panel animate-fade-in-up" style={{ gridColumn: 'span 4', padding: '24px', display: 'flex', flexDirection: 'column', animationDelay: '0.6s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span className="text-metadata">My Tasks & Tickets</span>
        </div>
        
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="skeleton-box" style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }}></div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="skeleton-box" style={{ height: '14px', width: '70%' }}></div>
                <div className="skeleton-box" style={{ height: '10px', width: '90%' }}></div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="skeleton-box" style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }}></div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="skeleton-box" style={{ height: '14px', width: '60%' }}></div>
                <div className="skeleton-box" style={{ height: '10px', width: '85%' }}></div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-glass-surface)', border: '1px solid var(--color-blob-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-ui-element)' }}>task_alt</span>
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>Frontend Integration</p>
                <p className="text-secondary" style={{ fontSize: '13px' }}>Due Tomorrow • Core Project</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-glass-surface)', border: '1px solid var(--color-blob-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-ui-element)' }}>support</span>
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>IT Ticket #4029</p>
                <p className="text-secondary" style={{ fontSize: '13px' }}>In Progress • Mouse replacement</p>
              </div>
            </div>
          </div>
        )}
        <button onClick={() => navigate(`/projects/${roleSlug}`)} className="btn btn-glass" style={{ width: '100%', marginTop: '24px' }}>View All</button>
      </section>

      {/* ================= ROW 4: DETAILS ROW ================= */}
      {/* Assigned Assets (M-10) */}
      <section className="glass-panel interactive animate-fade-in-up" style={{ gridColumn: 'span 6', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '0.7s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px' }}>Assigned Assets</h3>
          <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)' }}>devices</span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="glass-cutout" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-blob-1)' }}>laptop_mac</span>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600 }}>MacBook Pro 16"</p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Asset #IT-2025-84</p>
              </div>
            </div>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>Active</span>
          </div>
          <div className="glass-cutout" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-blob-1)' }}>vpn_key</span>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600 }}>JetBrains All Products</p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Software License</p>
              </div>
            </div>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>Active</span>
          </div>
        </div>
        <button onClick={() => navigate(`/helpdesk/${roleSlug}`)} className="btn btn-glass" style={{ width: '100%', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>report</span> Report Issue
        </button>
      </section>

    </main>
  );
}
