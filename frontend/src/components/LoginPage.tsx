import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ROLES = [
  { id: 'employee', name: 'Employee', color: '#38bdf8', icon: 'person', desc: 'Clock in, view payslips, manage goals, and interact with the AI assistant.' },
  { id: 'hr', name: 'HR Manager', color: '#8b5cf6', icon: 'groups', desc: 'Track recruitment pipelines, analyze org health, and manage performance cycles.' },
  { id: 'finance', name: 'Finance', color: '#f59e0b', icon: 'account_balance', desc: 'Process global payroll, forecast budgets, and approve expenses instantly.' },
  { id: 'it', name: 'IT Admin', color: '#ec4899', icon: 'computer', desc: 'Provision hardware, manage software licenses, and resolve helpdesk tickets.' },
  { id: 'super', name: 'Super Admin', color: '#10b981', icon: 'admin_panel_settings', desc: 'Oversee platform health, manage tenants, and configure security policies.' }
];

const FEATURES = [
  { title: 'Nexus Flow AI', desc: 'Context-aware assistant for policy queries, payroll audits, and IT triage.', icon: 'auto_awesome', color: '#10b981', span: 'span 2 / span 2', size: 'large' },
  { title: 'Global Payroll', desc: 'Multi-currency payouts, tax calculations, and dynamic employee payslips.', icon: 'payments', color: '#f59e0b', span: 'span 1 / span 1', size: 'normal' },
  { title: 'Dynamic Org Chart', desc: 'Visualize your company ecosystem. Track headcount with fluid drag-and-drop.', icon: 'account_tree', color: '#8b5cf6', span: 'span 1 / span 2', size: 'tall' },
  { title: 'Asset Management', desc: 'Track hardware lifecycle, manage software allocations, and execute remote wipes.', icon: 'devices', color: '#ec4899', span: 'span 1 / span 1', size: 'normal' },
  { title: 'Recruitment Kanban', desc: 'Track candidates, manage offers, and forecast payroll impact visually.', icon: 'badge', color: '#38bdf8', span: 'span 1 / span 1', size: 'normal' },
  { title: 'Performance & OKRs', desc: 'Manage goal tracking, 360° reviews, and percentage-based heatmaps.', icon: 'trending_up', color: '#10b981', span: 'span 1 / span 1', size: 'normal' },
  { title: 'Help Desk AI', desc: 'Intelligent ticket routing, SLA tracking, and auto-resolution for common IT/HR queries.', icon: 'support_agent', color: '#ec4899', span: 'span 2 / span 1', size: 'wide' },
  { title: 'Time & Absence', desc: 'Interactive attendance calendar with algorithmic anomaly detection.', icon: 'event_available', color: '#f59e0b', span: 'span 1 / span 1', size: 'normal' },
  { title: 'Project Tracking', desc: 'Monitor project budgets, logged hours, and intelligent completion forecasting.', icon: 'task_alt', color: '#38bdf8', span: 'span 1 / span 1', size: 'normal' }
];

import { apiClient } from '../api/client';

export default function LoginPage({ onLogin, theme, onThemeToggle }: { onLogin: (accessToken: string, refreshToken: string, user: any) => void, theme: 'light' | 'dark', onThemeToggle: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeRole, setActiveRole] = useState(ROLES[0]);
  const [scrolled, setScrolled] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = response.data.data;
      onLogin(accessToken, refreshToken, user);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setIsLoading(true);
    setError('');
    
    try {
      const response = await apiClient.post('/auth/login', { email: quickEmail, password: quickPass });
      const { accessToken, refreshToken, user } = response.data.data;
      onLogin(accessToken, refreshToken, user);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', overflowX: 'hidden' }}>
      
      {/* Dynamic Animated Background */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: -1, background: 'var(--color-background-base)' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '50vw', height: '50vw', background: 'rgba(56, 189, 248, 0.4)', borderRadius: '50%', filter: 'blur(100px)', animation: 'float 20s ease-in-out infinite alternate' }}></div>
        <div style={{ position: 'absolute', top: '10%', right: '-10%', width: '45vw', height: '45vw', background: 'rgba(139, 92, 246, 0.35)', borderRadius: '50%', filter: 'blur(100px)', animation: 'float 25s ease-in-out infinite alternate-reverse' }}></div>
        <div style={{ position: 'absolute', bottom: '-15%', left: '10%', width: '60vw', height: '60vw', background: 'rgba(245, 158, 11, 0.3)', borderRadius: '50%', filter: 'blur(120px)', animation: 'float 22s ease-in-out infinite alternate' }}></div>
        <div style={{ position: 'absolute', bottom: '20%', right: '20%', width: '40vw', height: '40vw', background: 'rgba(236, 72, 153, 0.3)', borderRadius: '50%', filter: 'blur(90px)', animation: 'float 18s ease-in-out infinite alternate-reverse' }}></div>
      </div>

      {/* Header */}
      <header style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', zIndex: 100, 
        background: scrolled ? 'var(--color-glass-surface)' : 'transparent', 
        backdropFilter: scrolled ? 'blur(20px)' : 'none', 
        borderBottom: scrolled ? '1px solid var(--cutout-border)' : '1px solid transparent',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--color-ui-element)' }}>all_inclusive</span>
          <span style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px' }}>Nexus Flow</span>
        </div>
        <nav style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <button onClick={onThemeToggle} className="btn btn-glass" style={{ padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Toggle Theme">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
          </button>
          <button onClick={() => scrollToSection('ecosystem')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 500, color: 'var(--color-ui-element)' }}>Ecosystem</button>
          <button onClick={() => scrollToSection('features')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 500, color: 'var(--color-ui-element)' }}>Modules</button>
          <button onClick={() => scrollToSection('login')} className="btn btn-primary" style={{ padding: '8px 24px', borderRadius: '20px' }}>Sign In</button>
        </nav>
      </header>

      <main style={{ paddingTop: '120px', paddingBottom: '80px', maxWidth: '1400px', margin: '0 auto', paddingLeft: '40px', paddingRight: '40px' }}>
        
        {/* HERO SECTION */}
        <section id="login" style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '60px', position: 'relative' }}>
          
          {/* Hero Left - Text & Abstract Dashboard Preview */}
          <div style={{ flex: '1 1 600px', zIndex: 2 }}>
            <div style={{ display: 'inline-block', padding: '8px 20px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', borderRadius: '30px', fontSize: '13px', fontWeight: 700, marginBottom: '24px', border: '1px solid rgba(16, 185, 129, 0.2)', backdropFilter: 'blur(10px)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>rocket_launch</span> NEXT-GEN ENTERPRISE OS</span>
            </div>
            <h1 style={{ fontSize: '72px', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.04em', marginBottom: '24px' }}>
              The Unified <br/><span style={{ color: 'var(--color-accent)' }}>Workforce Ecosystem.</span>
            </h1>
            <p style={{ fontSize: '20px', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '40px', maxWidth: '540px' }}>
              Break down silos between HR, Finance, and IT. Automate global payroll, manage complex org structures, and empower your teams with a context-aware AI.
            </p>
          </div>

          {/* Hero Right - Login Form */}
          <div style={{ flex: '1 1 400px', maxWidth: '480px', width: '100%', position: 'relative', zIndex: 2 }}>
            <div className="glass-panel" style={{ padding: '48px', width: '100%', boxShadow: '0 40px 80px rgba(0,0,0,0.1)' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Welcome Back</h2>
              <p className="text-secondary" style={{ fontSize: '15px', marginBottom: '32px' }}>Sign in to your intelligent workspace.</p>

              <form id="login-form" onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {error && (
                  <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '8px', fontSize: '13px', fontWeight: 500 }}>
                    {error}
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Work Email</label>
                  <div className="glass-cutout" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)', fontSize: '20px' }}>mail</span>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-ui-element)', width: '100%', fontSize: '15px', fontFamily: 'inherit' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Password</label>
                    <a href="#" style={{ fontSize: '12px', color: 'var(--color-ui-element)', textDecoration: 'none', fontWeight: 600 }}>Forgot?</a>
                  </div>
                  <div className="glass-cutout" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)', fontSize: '20px' }}>lock</span>
                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-ui-element)', width: '100%', fontSize: '15px', fontFamily: 'inherit' }} />
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ width: '100%', padding: '16px', borderRadius: '12px', fontSize: '15px', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  {isLoading ? 'Authenticating...' : 'Sign In to Workspace'} <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                </button>

                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                  <span className="text-secondary" style={{ fontSize: '14px' }}>Don't have an account? </span>
                  <Link to="/signup" style={{ fontSize: '14px', color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>Request Access</Link>
                </div>

                <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '16px', margin: '32px 0' }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--cutout-bg)' }}></div>
                  <span className="text-secondary" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>SSO</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--cutout-bg)' }}></div>
                </div>

                <div style={{ width: '100%', display: 'flex', gap: '16px' }}>
                  <button type="button" className="btn btn-glass" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18px" height="18px">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    Google
                  </button>
                  <button type="button" className="btn btn-glass" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" width="18px" height="18px">
                      <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                      <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                      <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                      <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                    </svg>
                    Microsoft
                  </button>
                </div>
              </form>

                {/* Always-Visible 1-Tap Demo Logins */}
                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--cutout-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>bolt</span> 1-Tap Demo Login
                    </p>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', opacity: 0.8 }}>Click any role</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    <button 
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleQuickLogin('hr@dev.com', 'Dev@1234')} 
                      className="btn btn-glass"
                      style={{ padding: '10px 8px', fontSize: '12.5px', fontWeight: 600, background: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.35)', color: 'var(--color-ui-element)', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', transition: 'all 0.2s' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#8b5cf6' }}>groups</span>
                      HR Manager
                    </button>
                    <button 
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleQuickLogin('admin@dev.com', 'Dev@1234')} 
                      className="btn btn-glass"
                      style={{ padding: '10px 8px', fontSize: '12.5px', fontWeight: 600, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', color: 'var(--color-ui-element)', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', transition: 'all 0.2s' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#10b981' }}>admin_panel_settings</span>
                      Super Admin
                    </button>
                    <button 
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleQuickLogin('finance@dev.com', 'Dev@1234')} 
                      className="btn btn-glass"
                      style={{ padding: '10px 8px', fontSize: '12.5px', fontWeight: 600, background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', color: 'var(--color-ui-element)', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', transition: 'all 0.2s' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#f59e0b' }}>account_balance</span>
                      Finance Exec
                    </button>
                    <button 
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleQuickLogin('it@dev.com', 'Dev@1234')} 
                      className="btn btn-glass"
                      style={{ padding: '10px 8px', fontSize: '12.5px', fontWeight: 600, background: 'rgba(236, 72, 153, 0.12)', border: '1px solid rgba(236, 72, 153, 0.35)', color: 'var(--color-ui-element)', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', transition: 'all 0.2s' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#ec4899' }}>computer</span>
                      IT Admin
                    </button>
                    <button 
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleQuickLogin('employee@dev.com', 'Dev@1234')} 
                      className="btn btn-glass"
                      style={{ gridColumn: 'span 2', padding: '10px 8px', fontSize: '12.5px', fontWeight: 600, background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.35)', color: 'var(--color-ui-element)', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', transition: 'all 0.2s' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#38bdf8' }}>person</span>
                      Standard Employee
                    </button>
                  </div>
                </div>
            </div>
          </div>
        </section>

        {/* METRICS BANNER */}
        <section style={{ margin: '80px 0' }}>
          <div className="glass-panel" style={{ padding: '40px', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '32px', borderRadius: '32px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: 800, color: 'var(--color-accent)' }}>12+</div>
              <div style={{ fontSize: '15px', fontWeight: 600, opacity: 0.7 }}>Integrated Modules</div>
            </div>
            <div style={{ width: '1px', background: 'rgba(0,0,0,0.1)' }}></div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: 800, color: '#10b981' }}>$2B+</div>
              <div style={{ fontSize: '15px', fontWeight: 600, opacity: 0.7 }}>Payroll Processed</div>
            </div>
            <div style={{ width: '1px', background: 'rgba(0,0,0,0.1)' }}></div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: 800, color: '#38bdf8' }}>5</div>
              <div style={{ fontSize: '15px', fontWeight: 600, opacity: 0.7 }}>Distinct Role Experiences</div>
            </div>
          </div>
        </section>

        {/* ROLE-BASED ECOSYSTEM SECTION */}
        <section id="ecosystem" style={{ padding: '80px 0', margin: '40px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontSize: '40px', fontWeight: 800, marginBottom: '16px' }}>One platform. Five tailored experiences.</h2>
            <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
              Nexus Flow dynamically adapts its entire interface, modules, and AI capabilities based on your organizational role.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Roles Navigation */}
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setActiveRole(role)}
                  className="glass-panel"
                  style={{
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    border: activeRole.id === role.id ? `2px solid ${role.color}` : '1px solid var(--glass-border-light)',
                    background: activeRole.id === role.id ? `${role.color}15` : 'var(--color-glass-surface)',
                    transform: activeRole.id === role.id ? 'scale(1.02)' : 'scale(1)',
                    transition: 'all 0.3s ease',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: role.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: `0 4px 16px ${role.color}40` }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>{role.icon}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ui-element)' }}>{role.name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Dashboard View</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Active Role Showcase */}
            <div style={{ flex: '1 1 500px' }}>
              <div className="glass-panel" style={{ padding: '48px', position: 'relative', overflow: 'hidden', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '300px', height: '300px', background: activeRole.color, opacity: 0.15, filter: 'blur(80px)', borderRadius: '50%', transition: 'background 0.5s ease' }}></div>
                
                <span className="material-symbols-outlined" style={{ fontSize: '64px', color: activeRole.color, marginBottom: '24px', transition: 'color 0.5s ease' }}>{activeRole.icon}</span>
                <h3 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>{activeRole.name} Experience</h3>
                <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '32px' }}>
                  {activeRole.desc}
                </p>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div className="glass-cutout" style={{ padding: '12px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                    <span className="material-symbols-outlined" style={{ color: activeRole.color, fontSize: '18px' }}>check_circle</span> Custom Metrics
                  </div>
                  <div className="glass-cutout" style={{ padding: '12px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                    <span className="material-symbols-outlined" style={{ color: activeRole.color, fontSize: '18px' }}>check_circle</span> RBAC Secured
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BENTO GRID MODULES */}
        <section id="features" style={{ padding: '80px 0', marginTop: '40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', borderRadius: '20px', fontSize: '13px', fontWeight: 700, marginBottom: '24px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>apps</span> COMPREHENSIVE SUITE
            </div>
            <h2 style={{ fontSize: '40px', fontWeight: 800 }}>Everything you need. Integrated seamlessly.</h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: '220px', gap: '24px' }}>
            {FEATURES.map((feat, idx) => (
              <div 
                key={idx} 
                className="glass-panel" 
                style={{ 
                  gridColumn: feat.size === 'large' || feat.size === 'wide' ? 'span 2' : 'span 1',
                  gridRow: feat.size === 'large' || feat.size === 'tall' ? 'span 2' : 'span 1',
                  padding: '32px', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  cursor: 'default',
                  position: 'relative',
                  overflow: 'hidden'
                }} 
                onMouseEnter={e => {e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 16px 32px ${feat.color}20`}} 
                onMouseLeave={e => {e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''}}
              >
                <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: feat.color, opacity: 0.1, filter: 'blur(30px)', borderRadius: '50%' }}></div>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${feat.color}15`, color: feat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: feat.size === 'normal' ? 'auto' : '24px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>{feat.icon}</span>
                </div>
                <div>
                  <h3 style={{ fontSize: feat.size === 'large' ? '28px' : '18px', fontWeight: 700, marginBottom: '8px' }}>{feat.title}</h3>
                  <p style={{ fontSize: feat.size === 'large' ? '16px' : '14px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    {feat.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(0,0,0,0.05)', padding: '64px 40px', background: 'var(--color-glass-surface)', backdropFilter: 'blur(20px)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '40px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--color-ui-element)' }}>all_inclusive</span>
              <span style={{ fontWeight: 800, fontSize: '20px' }}>Nexus Flow</span>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', maxWidth: '300px', lineHeight: 1.6 }}>
              The unified, intelligent enterprise ecosystem for HR, Finance, and IT.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '80px', flexWrap: 'wrap' }}>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '16px' }}>Product</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <a href="#" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '14px' }}>Modules</a>
                <a href="#" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '14px' }}>Role Ecosystem</a>
                <a href="#" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '14px' }}>Security (SOC 2)</a>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '16px' }}>Company</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <a href="#" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '14px' }}>About Us</a>
                <a href="#" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '14px' }}>Careers</a>
                <a href="#" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '14px' }}>Contact</a>
              </div>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: '1400px', margin: '64px auto 0', paddingTop: '32px', borderTop: '1px solid rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          <div>© 2026 Xebia. All rights reserved.</div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
