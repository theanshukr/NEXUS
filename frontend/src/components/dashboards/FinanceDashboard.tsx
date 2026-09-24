import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import AnimatedCounter from '../AnimatedCounter';
import { useToast } from '../ToastProvider';
import { apiClient } from '../../api/client';

const initialPayrollBurnData = [
  { month: 'Jan', projected: 1000, actual: 980 },
  { month: 'Feb', projected: 1050, actual: 1020 },
  { month: 'Mar', projected: 1100, actual: 1150 },
  { month: 'Apr', projected: 1150, actual: 1200 },
  { month: 'May', projected: 1200, actual: 1220 },
  { month: 'Jun', projected: 1250, actual: 1200 }
];

const costAllocationData = [
  { dept: 'Eng', salary: 400, benefits: 100, taxes: 80 },
  { dept: 'Sales', salary: 300, benefits: 80, taxes: 60 },
  { dept: 'Mktg', salary: 200, benefits: 50, taxes: 40 },
  { dept: 'Ops', salary: 250, benefits: 70, taxes: 50 }
];

export default function FinanceDashboard({ isAiActive, setIsAiActive, user }: { isAiActive: boolean, setIsAiActive: (val: boolean) => void, user?: any }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const roleSlug = 'finance';
  const [pendingExpenses] = useState(15);
  const [aiQuery, setAiQuery] = useState('');
  
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [latestPayrollRun, setLatestPayrollRun] = useState<any>(null);
  const [payrollBurnData, setPayrollBurnData] = useState(initialPayrollBurnData);

  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        const runsRes = await apiClient.get('/payroll-runs').catch(() => null);
        if (runsRes?.data?.data?.data) {
          const runs = runsRes.data.data.data;
          setPayrollRuns(runs);
          if (runs.length > 0) {
            setLatestPayrollRun(runs[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch finance data', err);
      }
    };
    fetchFinanceData();
  }, []);

  const handleUnreadyFeature = (featureName: string) => {
    showToast('Module in Development', 'info', `${featureName} module is currently in development`);
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
        <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>Good morning, {user?.firstName || 'Finance Team'}.</h1>
        <p className="text-secondary" style={{ fontSize: '16px', marginBottom: '32px', maxWidth: '600px', lineHeight: 1.6 }}>
          The payroll draft for this month is ready for initiation. There are {pendingExpenses} expense reports pending final approval. How can I assist you?
        </p>
        
        <div className="glass-cutout" style={{ padding: '8px', display: 'flex', alignItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ margin: '0 12px', color: 'var(--color-accent)' }}>auto_awesome</span>
          <input 
            type="text" 
            placeholder="Ask AI (e.g. 'Show me the total payroll projection for Q3')..." 
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

      {/* KPI Lens 1: Est. Payroll */}
      <section className="glass-panel animate-fade-in-up" style={{ gridColumn: 'span 4', padding: '24px', marginBottom: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', animationDelay: '0.1s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span className="text-metadata">Est. Payroll (Monthly)</span>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-text-secondary)' }}>more_horiz</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '16px' }}>
          <h2 style={{ fontSize: '40px', lineHeight: 1 }}>
            <AnimatedCounter 
              prefix="$" 
              value={latestPayrollRun?.totalGross ? latestPayrollRun.totalGross / 1000 : 1.2} 
              suffix={latestPayrollRun?.totalGross ? "k" : "M"} 
              decimals={1} 
            />
          </h2>
          <span style={{ color: 'var(--color-accent)', fontWeight: 500, fontSize: '14px' }}>-2% vs last month</span>
        </div>
        <div style={{ height: '80px', width: '100%', marginTop: 'auto' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={payrollBurnData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSparklineFinance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSparklineFinance)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ================= ROW 2: ACTION ROW ================= */}
      {/* Quick Actions Matrix */}
      <section style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
        <div className="glass-panel interactive animate-fade-in-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '0.2s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--color-blob-1)' }}>account_balance_wallet</span>
            <div>
              <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{latestPayrollRun ? 'Latest Payroll Run' : 'May Payroll Run'}</h3>
              <p className="text-secondary" style={{ fontSize: '14px' }}>Status: {latestPayrollRun?.status || 'Draft Generated'}</p>
            </div>
            <button onClick={() => navigate(`/payroll/${roleSlug}`)} className="btn btn-glass" style={{ width: '100%', marginTop: 'auto' }}>{latestPayrollRun ? 'Review Run' : 'Review Draft'}</button>
        </div>

        <div className="glass-panel interactive animate-fade-in-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '0.3s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--color-blob-2)' }}>receipt_long</span>
            <div>
              <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>Expense Claims</h3>
              <p className="text-secondary" style={{ fontSize: '14px' }}>{pendingExpenses} pending review</p>
            </div>
            <button onClick={() => navigate(`/expenses/${roleSlug}`)} className="btn btn-glass" style={{ width: '100%', marginTop: 'auto' }}>Approve Expenses</button>
        </div>

        <div className="glass-panel interactive animate-fade-in-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '0.4s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--color-blob-3)' }}>analytics</span>
            <div>
              <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>Financial Reports</h3>
              <p className="text-secondary" style={{ fontSize: '14px' }}>Q2 Variance Analysis</p>
            </div>
            <button onClick={() => handleUnreadyFeature('Financial Reports')} className="btn btn-glass" style={{ width: '100%', marginTop: 'auto' }}>View Reports</button>
        </div>
      </section>

      {/* ================= ROW 3: ANALYTICS ROW ================= */}
      {/* Payroll Burn (Line Chart) */}
      <section className="glass-panel animate-fade-in-up" style={{ gridColumn: 'span 8', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', animationDelay: '0.5s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px' }}>Payroll Burn (1k USD)</h3>
          <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)' }}>trending_up</span>
        </div>
        
        <div style={{ height: '260px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={payrollBurnData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-color)" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
              <Tooltip 
                contentStyle={{ background: 'var(--color-background-base)', borderRadius: '12px', border: '1px solid var(--glass-border-light)', boxShadow: '0 8px 32px var(--glass-shadow)', backdropFilter: 'blur(10px)' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="projected" stroke="var(--color-text-secondary)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
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
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-glass-surface)', border: '1px solid var(--color-blob-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-ui-element)' }}>edit_document</span>
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>Salary Revision</p>
              <p className="text-secondary" style={{ fontSize: '13px' }}>A. Sharma • Promoted to VP</p>
            </div>
          </div>
        </div>
        <button onClick={() => navigate(`/notifications/${roleSlug}`)} className="btn btn-glass" style={{ width: '100%', marginTop: '24px' }}>View All Actions</button>
      </section>

      {/* ================= ROW 4: DETAILS ROW ================= */}
      {/* Cost Allocation (Bar Chart) */}
      <section className="glass-panel animate-fade-in-up" style={{ gridColumn: 'span 6', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '0.7s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px' }}>Cost Allocation by Dept</h3>
          <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)' }}>bar_chart</span>
        </div>
        
        <div style={{ height: '240px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costAllocationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-color)" vertical={false} />
              <XAxis dataKey="dept" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
              <Tooltip 
                contentStyle={{ background: 'var(--color-background-base)', borderRadius: '12px', border: '1px solid var(--glass-border-light)', boxShadow: '0 8px 32px var(--glass-shadow)', backdropFilter: 'blur(10px)' }}
                cursor={{ fill: 'var(--cutout-bg)' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="salary" stackId="a" fill="#38bdf8" radius={[0, 0, 4, 4]} />
              <Bar dataKey="benefits" stackId="a" fill="#8b5cf6" />
              <Bar dataKey="taxes" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Stacked Details Column */}
      <div style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Pending Expense Claims (M-07) */}
        <section className="glass-panel interactive animate-fade-in-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '0.8s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '18px' }}>Expense Claims</h3>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)' }}>receipt</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', textAlign: 'center', gap: '12px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--color-text-secondary)', opacity: 0.5 }}>construction</span>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 500, marginBottom: '4px' }}>Module in Development</p>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Expense management is coming soon.</p>
            </div>
            <button onClick={() => handleUnreadyFeature('Expense Claims')} className="btn btn-glass" style={{ marginTop: '8px', fontSize: '13px', padding: '6px 16px' }}>Notify Me</button>
          </div>
        </section>

        {/* Tax Compliance Alerts (M-07) */}
        <section className="glass-panel interactive animate-fade-in-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, animationDelay: '0.9s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '18px' }}>Tax Compliance Alerts</h3>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)' }}>gavel</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', textAlign: 'center', gap: '12px', height: '100%' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--color-text-secondary)', opacity: 0.5 }}>verified_user</span>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 500, marginBottom: '4px' }}>Automated Compliance</p>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Tax compliance scanning will be available in Q4.</p>
            </div>
          </div>
        </section>
      </div>

    </main>
  );
}
