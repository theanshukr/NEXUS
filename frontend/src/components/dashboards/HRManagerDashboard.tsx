import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import AnimatedCounter from '../AnimatedCounter';
import { apiClient } from '../../api/client';

const historicalHeadcountData = [
  { month: 'Jan', headcount: 310 },
  { month: 'Feb', headcount: 315 },
  { month: 'Mar', headcount: 320 },
  { month: 'Apr', headcount: 328 },
  { month: 'May', headcount: 338 },
  { month: 'Jun', headcount: 350 },
];

const COLORS = ['#38bdf8', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#6366f1'];

export default function HRManagerDashboard({ isAiActive, setIsAiActive, user }: { isAiActive: boolean, setIsAiActive: (val: boolean) => void, user?: any }) {
  const navigate = useNavigate();
  const roleSlug = 'hr';
  const [totalHeadcount, setTotalHeadcount] = useState(0);
  const [deptData, setDeptData] = useState<{ name: string, value: number, color: string }[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [activeRequisitions, setActiveRequisitions] = useState(0);
  const [aiQuery, setAiQuery] = useState('');

  const handleAiSubmit = () => {
    if (aiQuery.trim()) {
      navigate(`/ai-assistant/${roleSlug}`, { state: { initialQuery: aiQuery } });
    }
  };

  useEffect(() => {
    // Fetch live data
    const fetchDashboardData = async () => {
      try {
        const [empRes, deptRes, leaveRes, reqRes] = await Promise.all([
          apiClient.get('/employees?limit=1'),
          apiClient.get('/departments'),
          apiClient.get('/leave/requests?status=PENDING_APPROVAL').catch(() => ({ data: { data: { total: 0 } } })),
          apiClient.get('/requisitions?status=OPEN').catch(() => ({ data: { data: { total: 0 } } }))
        ]);

        if (empRes.data?.data?.total !== undefined) {
          setTotalHeadcount(empRes.data.data.total);
        }

        if (deptRes.data?.data) {
          const depts = deptRes.data.data.items || deptRes.data.data || [];
          const mappedDepts = depts
            .filter((d: any) => d.cachedEmployeeCount > 0)
            .map((d: any, index: number) => ({
              name: d.name,
              value: d.cachedEmployeeCount,
              color: COLORS[index % COLORS.length]
            }));
          setDeptData(mappedDepts.length > 0 ? mappedDepts : [{ name: 'No Data', value: 1, color: '#ccc' }]);
        }

        // Try to read total from paginated responses if available
        setPendingLeaves(leaveRes?.data?.data?.total || 0);
        setActiveRequisitions(reqRes?.data?.data?.total || 0);
      } catch (err) {
        console.error('Failed to fetch HR dashboard data', err);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <main className="grid-12">
      {/* ================= ROW 1: HEADER & KPI ================= */}
      {/* Central AI Greeting */}
      <section className="glass-panel animate-fade-in-up" style={{ gridColumn: 'span 8', padding: '40px', marginBottom: '24px', animationDelay: '0s' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>Good morning, {user?.firstName || 'Arjun'}.</h1>
        <p className="text-secondary" style={{ fontSize: '16px', marginBottom: '32px', maxWidth: '600px', lineHeight: 1.6 }}>
          There are currently {pendingLeaves} pending leave requests requiring your approval, and the monthly payroll run is scheduled for tomorrow. How can I assist you today?
        </p>
        
        <div className="glass-cutout" style={{ padding: '8px', display: 'flex', alignItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ margin: '0 12px', color: 'var(--color-accent)' }}>
            auto_awesome
          </span>
          <input 
            type="text" 
            placeholder="Ask the AI Operations Assistant (e.g. 'Approve Priya's casual leave')..." 
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

      {/* KPI Lens 1: Headcount */}
      <section className="glass-panel animate-fade-in-up" style={{ gridColumn: 'span 4', padding: '24px', marginBottom: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', animationDelay: '0.1s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span className="text-metadata">Total Headcount</span>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-text-secondary)' }}>more_horiz</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '16px' }}>
          <h2 style={{ fontSize: '48px', lineHeight: 1 }}><AnimatedCounter value={totalHeadcount} /></h2>
          <span style={{ color: 'var(--color-accent)', fontWeight: 500, fontSize: '14px' }}>Total Active</span>
        </div>
        <div style={{ height: '80px', width: '100%', marginTop: 'auto' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalHeadcountData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSparklineHR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="headcount" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSparklineHR)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ================= ROW 2: ACTION ROW ================= */}
      {/* Quick Actions Matrix */}
      <section style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
        <div className="glass-panel interactive animate-fade-in-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '0.2s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>group_add</span>
            <div>
              <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>Recruitment</h3>
              <p className="text-secondary" style={{ fontSize: '14px' }}>{activeRequisitions} active job requisitions</p>
            </div>
            <button onClick={() => navigate(`/recruitment/${roleSlug}`)} className="btn btn-glass" style={{ width: '100%', marginTop: 'auto' }}>View Pipeline</button>
        </div>

        <div className="glass-panel interactive animate-fade-in-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '0.3s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>payments</span>
            <div>
              <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>Payroll Run</h3>
              <p className="text-secondary" style={{ fontSize: '14px' }}>Due in 2 days</p>
            </div>
            <button onClick={() => navigate(`/payroll/${roleSlug}`)} className="btn btn-glass" style={{ width: '100%', marginTop: 'auto' }}>Initiate Draft</button>
        </div>

        <div className="glass-panel interactive animate-fade-in-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '0.4s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>support_agent</span>
            <div>
              <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>Help Desk</h3>
              <p className="text-secondary" style={{ fontSize: '14px' }}>5 SLA breaches</p>
            </div>
            <button onClick={() => navigate(`/helpdesk/${roleSlug}`)} className="btn btn-glass" style={{ width: '100%', marginTop: 'auto' }}>Resolve Tickets</button>
        </div>
      </section>

      {/* ================= ROW 3: ANALYTICS ROW ================= */}
      {/* Headcount Growth (Area Chart) */}
      <section className="glass-panel animate-fade-in-up" style={{ gridColumn: 'span 8', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', animationDelay: '0.5s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px' }}>Headcount Growth (H1)</h3>
          <button onClick={() => navigate(`/employees/${roleSlug}`)} className="btn btn-glass" style={{ padding: '4px 8px', fontSize: '12px' }}>View Report</button>
        </div>
        
        <div style={{ height: '260px', width: '100%', marginTop: '8px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalHeadcountData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHeadcount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-color)" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
              <Tooltip 
                contentStyle={{ background: 'var(--color-background-base)', borderRadius: '12px', border: '1px solid var(--glass-border-light)', boxShadow: '0 8px 32px var(--glass-shadow)', backdropFilter: 'blur(10px)' }}
              />
              <Area type="monotone" dataKey="headcount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorHeadcount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Action Feed Widget */}
      <section className="glass-panel animate-fade-in-up" style={{ gridColumn: 'span 4', padding: '24px', display: 'flex', flexDirection: 'column', marginBottom: '24px', animationDelay: '0.6s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span className="text-metadata">Pending Actions</span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-glass-surface)', border: '1px solid var(--color-blob-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-ui-element)' }}>event_available</span>
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>Leave Request</p>
              <p className="text-secondary" style={{ fontSize: '13px' }}>Priya Sharma • 2 Days Casual</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-glass-surface)', border: '1px solid var(--color-blob-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-ui-element)' }}>fact_check</span>
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>Attendance Regularization</p>
              <p className="text-secondary" style={{ fontSize: '13px' }}>Rahul Desai • Missed Punch</p>
            </div>
          </div>
        </div>
        <button onClick={() => navigate(`/notifications/${roleSlug}`)} className="btn btn-glass" style={{ width: '100%', marginTop: '24px' }}>View All Actions</button>
      </section>

      {/* ================= ROW 4: DETAILS ROW ================= */}
      {/* Department Breakdown (Donut Chart) */}
      <section className="glass-panel animate-fade-in-up" style={{ gridColumn: 'span 6', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '0.7s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px' }}>Department Breakdown</h3>
          <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)' }}>pie_chart</span>
        </div>
        
        <div style={{ height: '220px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={deptData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {deptData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Attendance Status */}
      <section className="glass-panel animate-fade-in-up" style={{ gridColumn: 'span 6', padding: '24px', animationDelay: '0.8s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px' }}>Attendance Status</h3>
          <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)' }}>more_horiz</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Present</span>
                <span style={{ fontWeight: 600 }}>312</span>
              </div>
              <div style={{ height: '6px', background: 'var(--cutout-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: '89%', height: '100%', background: 'var(--color-accent)' }}></div>
              </div>
            </div>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>On Leave</span>
                <span style={{ fontWeight: 600 }}>18</span>
              </div>
              <div style={{ height: '6px', background: 'var(--cutout-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: '5%', height: '100%', background: 'var(--color-blob-3)' }}></div>
              </div>
            </div>
        </div>
      </section>

    </main>
  );
}
