import React, { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, Link, useParams } from 'react-router-dom';
import './index.css';
import { ToastProvider } from './components/ToastProvider';
import GlobalNotificationEngine from './components/GlobalNotificationEngine';
import { apiClient } from './api/client';

// ─── Eager: small critical-path components ────────────────────────────────────
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import AcceptInvitePage from './components/AcceptInvitePage';
import HRManagerDashboard from './components/dashboards/HRManagerDashboard';
import EmployeeDashboard from './components/dashboards/EmployeeDashboard';
import ITAdminDashboard from './components/dashboards/ITAdminDashboard';
import FinanceDashboard from './components/dashboards/FinanceDashboard';
import SuperAdminDashboard from './components/dashboards/SuperAdminDashboard';

// ─── Lazy: heavy feature views (code-split into separate chunks) ──────────────
const AIAssistantView       = lazy(() => import('./components/AIAssistantView'));
const PolicyNexusView       = lazy(() => import('./components/PolicyNexusView'));
const RecruitmentPipelineView = lazy(() => import('./components/RecruitmentPipelineView'));
const EmployeeManagementView = lazy(() => import('./components/EmployeeManagementView'));
const OrgChartView          = lazy(() => import('./components/OrgChartView'));
const TimeAbsenceView       = lazy(() => import('./components/TimeAbsenceView'));
const NotificationsView         = lazy(() => import('./components/NotificationsView'));
const PayrollView               = lazy(() => import('./components/PayrollView'));
const ProjectManagementView     = lazy(() => import('./components/ProjectManagementView'));
const HelpDeskView              = lazy(() => import('./components/HelpDeskView'));
const PerformanceManagementView = lazy(() => import('./components/PerformanceManagementView'));
const AssetManagementView       = lazy(() => import('./components/AssetManagementView'));
const ExpenseClaimsView         = lazy(() => import('./components/ExpenseClaimsView'));

// ─── Suspense skeleton fallback ───────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '3px solid var(--cutout-border)',
          borderTopColor: 'var(--color-ui-element)',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Loading...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

const ROLE_THEMES: Record<string, React.CSSProperties> = {
  'Standard Employee': { '--color-blob-1': 'rgba(14, 165, 233, 0.32)', '--color-blob-2': 'rgba(56, 189, 248, 0.32)', '--color-blob-3': 'rgba(2, 132, 199, 0.32)' } as React.CSSProperties,
  'HR Manager': { '--color-blob-1': 'rgba(16, 185, 129, 0.25)', '--color-blob-2': 'rgba(52, 211, 153, 0.25)', '--color-blob-3': 'rgba(5, 150, 105, 0.25)' } as React.CSSProperties,
  'Administrator': { '--color-blob-1': 'rgba(245, 158, 11, 0.3)', '--color-blob-2': 'rgba(251, 191, 36, 0.3)', '--color-blob-3': 'rgba(217, 119, 6, 0.3)' } as React.CSSProperties,
  'Finance Executive': { '--color-blob-1': 'rgba(236, 72, 153, 0.25)', '--color-blob-2': 'rgba(244, 114, 182, 0.25)', '--color-blob-3': 'rgba(219, 39, 119, 0.25)' } as React.CSSProperties,
  'Super Admin': { '--color-blob-1': 'rgba(139, 92, 246, 0.3)', '--color-blob-2': 'rgba(167, 139, 250, 0.3)', '--color-blob-3': 'rgba(124, 58, 237, 0.3)' } as React.CSSProperties,
  Login: { '--color-blob-1': 'rgba(148, 163, 184, 0.3)', '--color-blob-2': 'rgba(203, 213, 225, 0.3)', '--color-blob-3': 'rgba(100, 116, 139, 0.3)' } as React.CSSProperties
};

const PATH_TO_ROLE: Record<string, string> = {
  employee: 'Standard Employee',
  hr: 'HR Manager',
  admin: 'Administrator',
  finance: 'Finance Executive',
  superadmin: 'Super Admin'
};

const ROLE_TO_PATH: Record<string, string> = {
  'Standard Employee': 'employee',
  'HR Manager': 'hr',
  'Administrator': 'admin',
  'Finance Executive': 'finance',
  'Super Admin': 'superadmin'
};

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Real authentication state (persisted via tokens in localStorage)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('accessToken');
  });
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (isAuthenticated) {
        try {
          const response = await apiClient.get('/auth/me');
          setUserProfile(response.data.data.user);
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          setIsAuthenticated(false);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setIsLoadingAuth(false);
    };
    fetchUser();
  }, [isAuthenticated]);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Global mouse tracker for dynamic glass edge lighting
  useEffect(() => {
    let rafId: number | null = null;
    let lastX = 0;
    let lastY = 0;

    const updateGlassElements = (x: number, y: number) => {
      document.body.style.setProperty('--mouse-x', `${x}px`);
      document.body.style.setProperty('--mouse-y', `${y}px`);

      document.querySelectorAll<HTMLElement>('.glass-panel, .glass-cutout, .glass-nav-pill, .btn-glass').forEach(el => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--local-mouse-x', `${x - rect.left}px`);
        el.style.setProperty('--local-mouse-y', `${y - rect.top}px`);
      });

      rafId = null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;

      if (rafId === null) {
        rafId = requestAnimationFrame(() => updateGlassElements(lastX, lastY));
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // Extract view and role from URL (e.g. /dashboard/hr -> view='dashboard', pathRole='hr')
  const pathParts = location.pathname.split('/').filter(Boolean);
  const viewType = pathParts[0] || 'login'; // 'login', 'signup', 'dashboard', 'ai-assistant', 'documents', 'recruitment', or 'time'
  
  // Use the actual user role from the backend if available, otherwise fallback to URL or Employee
  const currentRole = userProfile?.roles?.[0] || PATH_TO_ROLE[pathParts[1] || 'employee'] || 'Standard Employee';
  
  const [isAiActive, setIsAiActive] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Apply CSS Variables based on current route
  useEffect(() => {
    const root = document.documentElement;
    // Default to the Employee theme (Blue) for the login page to ensure consistency
    const theme = viewType === 'login' ? ROLE_THEMES['Login'] : ROLE_THEMES[currentRole];
    if (theme) {
      Object.entries(theme).forEach(([key, value]) => {
        root.style.setProperty(key, value as string);
      });
    }
  }, [viewType, currentRole]);

  const handleLogin = (accessToken: string, refreshToken: string, user: any) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUserProfile(user);
    setIsAuthenticated(true);
    
    // Route to appropriate dashboard based on their role
    const primaryRole = user.roles?.[0] || 'Standard Employee';
    const pathSlug = ROLE_TO_PATH[primaryRole] || 'employee';
    navigate(`/dashboard/${pathSlug}`);
  };

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.error('Logout failed', e);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUserProfile(null);
      setIsAuthenticated(false);
      navigate('/login');
    }
  };



  if (isLoadingAuth) {
    return <PageSkeleton />;
  }

  if (!isAuthenticated || viewType === 'login' || viewType === 'signup' || viewType === 'join') {
    // If authenticated but trying to access login/signup page, redirect to dashboard
    if (isAuthenticated && (viewType === 'login' || viewType === 'signup' || viewType === 'join')) {
      const primaryRole = userProfile?.roles?.[0] || 'Standard Employee';
      const pathSlug = ROLE_TO_PATH[primaryRole] || 'employee';
      return <Navigate to={`/dashboard/${pathSlug}`} replace />;
    }

    // If not authenticated, force login/signup/join view
    return (
      <div data-theme={theme} style={{ minHeight: '100vh', width: '100vw', overflowX: 'hidden' }}>
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={handleLogin} theme={theme} onThemeToggle={() => setTheme(t => t === 'light' ? 'dark' : 'light')} />} />
          <Route path="/signup" element={<SignupPage theme={theme} onThemeToggle={() => setTheme(t => t === 'light' ? 'dark' : 'light')} />} />
          <Route path="/join" element={<AcceptInvitePage theme={theme} onThemeToggle={() => setTheme(t => t === 'light' ? 'dark' : 'light')} onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  // Strictly enforce that the user cannot view another role's dashboard slug
  const actualPathSlug = ROLE_TO_PATH[currentRole] || 'employee';
  if (pathParts[1] && pathParts[1] !== actualPathSlug) {
    return <Navigate to={`/${viewType}/${actualPathSlug}`} replace />;
  }

  return (
    <ToastProvider>
      <GlobalNotificationEngine />
      <div className="ambient-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div className="app-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          
          {/* Left: Branding & Theme */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingLeft: '8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--color-ui-element)' }}>
                all_inclusive
              </span>
              <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>Nexus Flow</span>
            </div>
          </div>

          <nav className="glass-nav-pill" style={{ padding: '6px 10px', margin: '0 16px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
              <Link to={`/dashboard/${ROLE_TO_PATH[currentRole]}`} style={{ textDecoration: 'none' }}>
                <button
                  className={`btn btn-glass ${viewType === 'dashboard' ? 'active' : ''}`}
                  style={{ border: 'none', background: viewType === 'dashboard' ? 'var(--nav-active-bg)' : 'transparent', opacity: viewType === 'dashboard' ? 1 : 0.65, color: 'var(--color-ui-element)', padding: '8px 18px', fontSize: '13.5px', fontWeight: viewType === 'dashboard' ? 600 : 400, boxShadow: viewType === 'dashboard' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', borderRadius: '10px', whiteSpace: 'nowrap' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px', marginRight: '5px', verticalAlign: 'middle' }}>grid_view</span>
                  Dashboard
                </button>
              </Link>

              <Link to={`/time/${ROLE_TO_PATH[currentRole]}`} style={{ textDecoration: 'none' }}>
                <button
                  className={`btn btn-glass ${viewType === 'time' ? 'active' : ''}`}
                  style={{ border: 'none', background: viewType === 'time' ? 'var(--nav-active-bg)' : 'transparent', opacity: viewType === 'time' ? 1 : 0.65, color: 'var(--color-ui-element)', padding: '8px 18px', fontSize: '13.5px', fontWeight: viewType === 'time' ? 600 : 400, boxShadow: viewType === 'time' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', borderRadius: '10px', whiteSpace: 'nowrap' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px', marginRight: '5px', verticalAlign: 'middle' }}>schedule</span>
                  Time & Absence
                </button>
              </Link>
              
              <Link to={`/projects/${ROLE_TO_PATH[currentRole]}`} style={{ textDecoration: 'none' }}>
                <button
                  className={`btn btn-glass ${viewType === 'projects' ? 'active' : ''}`}
                  style={{ border: 'none', background: viewType === 'projects' ? 'var(--nav-active-bg)' : 'transparent', opacity: viewType === 'projects' ? 1 : 0.65, color: 'var(--color-ui-element)', padding: '8px 18px', fontSize: '13.5px', fontWeight: viewType === 'projects' ? 600 : 400, boxShadow: viewType === 'projects' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', borderRadius: '10px', whiteSpace: 'nowrap' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px', marginRight: '5px', verticalAlign: 'middle' }}>assignment</span>
                  Projects
                </button>
              </Link>

              <Link to={`/employees/${ROLE_TO_PATH[currentRole]}`} style={{ textDecoration: 'none' }}>
                <button
                  className={`btn btn-glass ${viewType === 'employees' ? 'active' : ''}`}
                  style={{ border: 'none', background: viewType === 'employees' ? 'var(--nav-active-bg)' : 'transparent', opacity: viewType === 'employees' ? 1 : 0.65, color: 'var(--color-ui-element)', padding: '8px 18px', fontSize: '13.5px', fontWeight: viewType === 'employees' ? 600 : 400, boxShadow: viewType === 'employees' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', borderRadius: '10px', whiteSpace: 'nowrap' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px', marginRight: '5px', verticalAlign: 'middle' }}>badge</span>
                  Directory
                </button>
              </Link>
              
              <Link to={`/helpdesk/${ROLE_TO_PATH[currentRole]}`} style={{ textDecoration: 'none' }}>
                <button
                  className={`btn btn-glass ${viewType === 'helpdesk' ? 'active' : ''}`}
                  style={{ border: 'none', background: viewType === 'helpdesk' ? 'var(--nav-active-bg)' : 'transparent', opacity: viewType === 'helpdesk' ? 1 : 0.65, color: 'var(--color-ui-element)', padding: '8px 18px', fontSize: '13.5px', fontWeight: viewType === 'helpdesk' ? 600 : 400, boxShadow: viewType === 'helpdesk' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', borderRadius: '10px', whiteSpace: 'nowrap' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px', marginRight: '5px', verticalAlign: 'middle' }}>support_agent</span>
                  Help Desk
                </button>
              </Link>
              
              <Link to={`/ai-assistant/${ROLE_TO_PATH[currentRole]}`} style={{ textDecoration: 'none' }}>
                <button
                  className={`btn btn-glass ${viewType === 'ai-assistant' ? 'active' : ''}`}
                  style={{ border: 'none', background: viewType === 'ai-assistant' ? 'var(--nav-active-bg)' : 'transparent', opacity: viewType === 'ai-assistant' ? 1 : 0.65, color: 'var(--color-ui-element)', padding: '8px 18px', fontSize: '13.5px', fontWeight: viewType === 'ai-assistant' ? 600 : 400, boxShadow: viewType === 'ai-assistant' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', borderRadius: '10px', whiteSpace: 'nowrap' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px', marginRight: '5px', verticalAlign: 'middle' }}>auto_awesome</span>
                  AI Assistant
                </button>
              </Link>            </div>
          </nav>

          {/* Right: Action Icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            
            {/* App Switcher (More Modules) */}
            <div style={{ position: 'relative' }} ref={moreMenuRef}>
              <button 
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className={`btn btn-glass ${['org-chart', 'payroll', 'performance', 'assets', 'documents', 'recruitment', 'expenses'].includes(viewType) ? 'active' : ''}`}
                style={{ width: '38px', height: '38px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: ['org-chart', 'payroll', 'performance', 'assets', 'documents', 'recruitment', 'expenses'].includes(viewType) ? 'var(--nav-active-bg)' : 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.6)', opacity: ['org-chart', 'payroll', 'performance', 'assets', 'documents', 'recruitment', 'expenses'].includes(viewType) ? 1 : 0.75 }}
                title="More Modules"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--color-ui-element)' }}>apps</span>
              </button>
              
              {isMoreMenuOpen && (
                <div className="glass-panel" style={{ position: 'absolute', top: 'calc(100% + 12px)', right: 0, minWidth: '220px', display: 'flex', flexDirection: 'column', padding: '12px', zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px', paddingLeft: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>More Modules</div>
                  
                  <Link to={`/documents/${ROLE_TO_PATH[currentRole]}`} style={{ textDecoration: 'none' }} onClick={() => setIsMoreMenuOpen(false)}>
                    <button className="btn btn-glass" style={{ width: '100%', textAlign: 'left', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', border: 'none', background: viewType === 'documents' ? 'var(--nav-active-bg)' : 'transparent', color: 'var(--color-ui-element)', borderRadius: '8px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>folder_open</span> Documents
                    </button>
                  </Link>
                  <Link to={`/performance/${ROLE_TO_PATH[currentRole]}`} style={{ textDecoration: 'none' }} onClick={() => setIsMoreMenuOpen(false)}>
                    <button className="btn btn-glass" style={{ width: '100%', textAlign: 'left', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', border: 'none', background: viewType === 'performance' ? 'var(--nav-active-bg)' : 'transparent', color: 'var(--color-ui-element)', borderRadius: '8px', marginTop: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>trending_up</span> Performance
                    </button>
                  </Link>
                  <Link to={`/payroll/${ROLE_TO_PATH[currentRole]}`} style={{ textDecoration: 'none' }} onClick={() => setIsMoreMenuOpen(false)}>
                    <button className="btn btn-glass" style={{ width: '100%', textAlign: 'left', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', border: 'none', background: viewType === 'payroll' ? 'var(--nav-active-bg)' : 'transparent', color: 'var(--color-ui-element)', borderRadius: '8px', marginTop: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>account_balance_wallet</span> Payroll
                    </button>
                  </Link>
                  <Link to={`/assets/${ROLE_TO_PATH[currentRole]}`} style={{ textDecoration: 'none' }} onClick={() => setIsMoreMenuOpen(false)}>
                    <button className="btn btn-glass" style={{ width: '100%', textAlign: 'left', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', border: 'none', background: viewType === 'assets' ? 'var(--nav-active-bg)' : 'transparent', color: 'var(--color-ui-element)', borderRadius: '8px', marginTop: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>devices</span> Assets
                    </button>
                  </Link>
                  <Link to={`/expenses/${ROLE_TO_PATH[currentRole]}`} style={{ textDecoration: 'none' }} onClick={() => setIsMoreMenuOpen(false)}>
                    <button className="btn btn-glass" style={{ width: '100%', textAlign: 'left', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', border: 'none', background: viewType === 'expenses' ? 'var(--nav-active-bg)' : 'transparent', color: 'var(--color-ui-element)', borderRadius: '8px', marginTop: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>receipt_long</span> Expenses
                    </button>
                  </Link>
                  <Link to={`/org-chart/${ROLE_TO_PATH[currentRole]}`} style={{ textDecoration: 'none' }} onClick={() => setIsMoreMenuOpen(false)}>
                    <button className="btn btn-glass" style={{ width: '100%', textAlign: 'left', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', border: 'none', background: viewType === 'org-chart' ? 'var(--nav-active-bg)' : 'transparent', color: 'var(--color-ui-element)', borderRadius: '8px', marginTop: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>account_tree</span> Org Chart
                    </button>
                  </Link>
                  <Link to={`/recruitment/${ROLE_TO_PATH[currentRole]}`} style={{ textDecoration: 'none' }} onClick={() => setIsMoreMenuOpen(false)}>
                    <button className="btn btn-glass" style={{ width: '100%', textAlign: 'left', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', border: 'none', background: viewType === 'recruitment' ? 'var(--nav-active-bg)' : 'transparent', color: 'var(--color-ui-element)', borderRadius: '8px', marginTop: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>group_add</span> Recruitment
                    </button>
                  </Link>
                </div>
              )}
            </div>

            <Link to={`/notifications/${ROLE_TO_PATH[currentRole]}`} style={{ textDecoration: 'none', display: 'flex' }}>
              <button className="btn btn-glass" style={{ width: '38px', height: '38px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: viewType === 'notifications' ? 'var(--nav-active-bg)' : 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.6)', opacity: viewType === 'notifications' ? 1 : 0.75 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--color-ui-element)' }}>notifications</span>
              </button>
            </Link>
            <button 
              className="btn btn-glass interactive"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              style={{ width: '38px', height: '38px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.6)', opacity: 0.75 }}
              title="Toggle Theme"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--color-ui-element)' }}>
                {theme === 'light' ? 'dark_mode' : 'light_mode'}
              </span>
            </button>

            <button className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }} onClick={handleLogout}>Log Out</button>
          </div>
        </header>

        {/* Page transition wrapper — key forces remount on route change */}
        <Suspense fallback={<PageSkeleton />}>
          <div key={location.pathname} className="page-transition">
            <Routes>
              <Route path="/dashboard/employee" element={<EmployeeDashboard isAiActive={isAiActive} setIsAiActive={setIsAiActive} user={userProfile} />} />
              <Route path="/dashboard/hr" element={<HRManagerDashboard isAiActive={isAiActive} setIsAiActive={setIsAiActive} user={userProfile} />} />
              <Route path="/dashboard/admin" element={<ITAdminDashboard isAiActive={isAiActive} setIsAiActive={setIsAiActive} user={userProfile} />} />
              <Route path="/dashboard/finance" element={<FinanceDashboard isAiActive={isAiActive} setIsAiActive={setIsAiActive} user={userProfile} />} />
              <Route path="/dashboard/superadmin" element={<SuperAdminDashboard isAiActive={isAiActive} setIsAiActive={setIsAiActive} user={userProfile} />} />
              
              <Route path="/documents/:roleSlug" element={<PolicyNexusWrapper user={userProfile} />} />
              <Route path="/recruitment/:roleSlug" element={<RecruitmentPipelineWrapper user={userProfile} />} />
              <Route path="/time/:roleSlug" element={<TimeAbsenceWrapper user={userProfile} />} />
              <Route path="/employees/:roleSlug" element={<EmployeeManagementWrapper user={userProfile} />} />
              <Route path="/org-chart/:roleSlug" element={<OrgChartWrapper user={userProfile} />} />
              <Route path="/payroll/:roleSlug" element={<PayrollWrapper user={userProfile} />} />
              <Route path="/projects/:roleSlug" element={<ProjectManagementWrapper user={userProfile} />} />
              <Route path="/helpdesk/:roleSlug" element={<HelpDeskWrapper user={userProfile} />} />
              <Route path="/performance/:roleSlug" element={<PerformanceWrapper user={userProfile} />} />
              <Route path="/assets/:roleSlug" element={<AssetWrapper user={userProfile} />} />
              <Route path="/expenses/:roleSlug" element={<ExpenseClaimsWrapper user={userProfile} />} />
              <Route path="/ai-assistant/:roleSlug" element={<AIAssistantWrapper user={userProfile} />} />
              <Route path="/notifications/:roleSlug" element={<NotificationsWrapper user={userProfile} />} />
              
              <Route path="*" element={<Navigate to={`/dashboard/${ROLE_TO_PATH[currentRole]}`} replace />} />
            </Routes>
          </div>
        </Suspense>
      </div>
    </ToastProvider>
  );
}

// Small wrapper component to map URL params to AIAssistantView props
function AIAssistantWrapper({ user }: { user?: any }) {
  const { roleSlug } = useParams<{ roleSlug: string }>();
  const activeRole = PATH_TO_ROLE[roleSlug || 'employee'] || 'Standard Employee';
  return <AIAssistantView role={activeRole} user={user} />;
}

// Small wrapper component to map URL params to PolicyNexusView props
function PolicyNexusWrapper({ user }: { user?: any }) {
  const { roleSlug } = useParams<{ roleSlug: string }>();
  const activeRole = PATH_TO_ROLE[roleSlug || 'employee'] || 'Standard Employee';
  return <PolicyNexusView role={activeRole} user={user} />;
}

// Small wrapper component to map URL params to RecruitmentPipelineView props
function RecruitmentPipelineWrapper({ user }: { user?: any }) {
  const { roleSlug } = useParams<{ roleSlug: string }>();
  const activeRole = PATH_TO_ROLE[roleSlug || 'employee'] || 'Standard Employee';
  return <RecruitmentPipelineView role={activeRole} user={user} />;
}

// Small wrapper component to map URL params to TimeAbsenceView props
function TimeAbsenceWrapper({ user }: { user?: any }) {
  const { roleSlug } = useParams<{ roleSlug: string }>();
  const activeRole = PATH_TO_ROLE[roleSlug || 'employee'] || 'Standard Employee';
  return <TimeAbsenceView role={activeRole} user={user} />;
}

function NotificationsWrapper({ user }: { user?: any }) {
  const { roleSlug } = useParams<{ roleSlug: string }>();
  const activeRole = PATH_TO_ROLE[roleSlug || 'employee'] || 'Standard Employee';
  return <NotificationsView role={activeRole} user={user} />;
}

// Small wrapper component to map URL params to PayrollView props
function PayrollWrapper({ user }: { user?: any }) {
  const { roleSlug } = useParams<{ roleSlug: string }>();
  const activeRole = PATH_TO_ROLE[roleSlug || 'employee'] || 'Standard Employee';
  return <PayrollView role={activeRole} user={user} />;
}

// Small wrapper component to map URL params to EmployeeManagementView props
function EmployeeManagementWrapper({ user }: { user?: any }) {
  const { roleSlug } = useParams<{ roleSlug: string }>();
  const activeRole = PATH_TO_ROLE[roleSlug || 'employee'] || 'Standard Employee';
  return <EmployeeManagementView role={activeRole} user={user} />;
}

// Small wrapper component to map URL params to OrgChartView props
function OrgChartWrapper({ user }: { user?: any }) {
  const { roleSlug } = useParams<{ roleSlug: string }>();
  const activeRole = PATH_TO_ROLE[roleSlug || 'employee'] || 'Standard Employee';
  return <OrgChartView role={activeRole} user={user} />;
}

// Small wrapper component to map URL params to ProjectManagementView props
function ProjectManagementWrapper({ user }: { user?: any }) {
  const { roleSlug } = useParams<{ roleSlug: string }>();
  const activeRole = PATH_TO_ROLE[roleSlug || 'employee'] || 'Standard Employee';
  return <ProjectManagementView role={activeRole} user={user} />;
}

// Small wrapper component to map URL params to HelpDeskView props
function HelpDeskWrapper({ user }: { user?: any }) {
  const { roleSlug } = useParams<{ roleSlug: string }>();
  const activeRole = PATH_TO_ROLE[roleSlug || 'employee'] || 'Standard Employee';
  return <HelpDeskView role={activeRole} user={user} />;
}

// Small wrapper component to map URL params to PerformanceManagementView props
function PerformanceWrapper({ user }: { user?: any }) {
  const { roleSlug } = useParams<{ roleSlug: string }>();
  const activeRole = PATH_TO_ROLE[roleSlug || 'employee'] || 'Standard Employee';
  return <PerformanceManagementView role={activeRole} user={user} />;
}

// Small wrapper component to map URL params to AssetManagementView props
function AssetWrapper({ user }: { user?: any }) {
  const { roleSlug } = useParams<{ roleSlug: string }>();
  const activeRole = PATH_TO_ROLE[roleSlug || 'employee'] || 'Standard Employee';
  return <AssetManagementView role={activeRole} user={user} />;
}

// Small wrapper component to map URL params to ExpenseClaimsView props
function ExpenseClaimsWrapper({ user }: { user?: any }) {
  const { roleSlug } = useParams<{ roleSlug: string }>();
  const activeRole = PATH_TO_ROLE[roleSlug || 'employee'] || 'Standard Employee';
  return <ExpenseClaimsView role={activeRole} user={user} />;
}

export default App;
