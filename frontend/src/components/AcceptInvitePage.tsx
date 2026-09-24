import { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

interface AcceptInvitePageProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onLogin: (accessToken: string, refreshToken: string, user: any) => void;
}

export default function AcceptInvitePage({ theme, onThemeToggle, onLogin }: AcceptInvitePageProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Get token from search query
  const query = new URLSearchParams(location.search);
  const token = query.get('token') || '';

  const [isTokenValidating, setIsTokenValidating] = useState(true);
  const [tokenError, setTokenError] = useState('');
  const [inviteData, setInviteData] = useState<any>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 1. Validate Token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenError('Invitation token is missing from the URL. Please verify your link.');
        setIsTokenValidating(false);
        return;
      }

      try {
        const res = await apiClient.get(`/invites/validate/${token}`);
        if (res.data?.success) {
          setInviteData(res.data.data);
          // Prefill email if provided in the invitation
          if (res.data.data.email) {
            setFormData(prev => ({ ...prev, email: res.data.data.email }));
          }
        } else {
          setTokenError('This invitation link is invalid or expired.');
        }
      } catch (err: any) {
        console.error('Validation failed', err);
        setTokenError(err.response?.data?.error?.message || 'Failed to validate invitation token.');
      } finally {
        setIsTokenValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/auth/register-invite', {
        token,
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim()
      });

      const { accessToken, refreshToken, user } = response.data.data;
      onLogin(accessToken, refreshToken, user);
      // Navigate to the role-appropriate dashboard
      const roleToPath: Record<string, string> = {
        'Standard Employee': 'employee',
        'HR Manager': 'hr',
        'Administrator': 'admin',
        'Finance Executive': 'finance',
        'Super Admin': 'superadmin',
      };
      const primaryRole = user?.roles?.[0] || 'Standard Employee';
      const pathSlug = roleToPath[primaryRole] || 'employee';
      navigate(`/dashboard/${pathSlug}`);
    } catch (err: any) {
      const errorData = err.response?.data?.error || err.response?.data;
      if (errorData?.details && Array.isArray(errorData.details)) {
        const messages = errorData.details.map((d: any) => d.message).join(' ');
        setError(messages);
      } else {
        setError(errorData?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflowX: 'hidden' }}>
      
      {/* Dynamic Animated Background */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: -1, background: 'var(--color-background-base)' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '50vw', height: '50vw', background: 'rgba(56, 189, 248, 0.4)', borderRadius: '50%', filter: 'blur(100px)', animation: 'float 20s ease-in-out infinite alternate' }}></div>
        <div style={{ position: 'absolute', top: '10%', right: '-10%', width: '45vw', height: '45vw', background: 'rgba(139, 92, 246, 0.35)', borderRadius: '50%', filter: 'blur(100px)', animation: 'float 25s ease-in-out infinite alternate-reverse' }}></div>
        <div style={{ position: 'absolute', bottom: '-15%', left: '10%', width: '60vw', height: '60vw', background: 'rgba(245, 158, 11, 0.3)', borderRadius: '50%', filter: 'blur(120px)', animation: 'float 22s ease-in-out infinite alternate' }}></div>
      </div>

      <div className="glass-panel" style={{ padding: '48px', width: '100%', maxWidth: '540px', boxShadow: '0 40px 80px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', justifyContent: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--color-ui-element)' }}>all_inclusive</span>
          <span style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px' }}>Nexus Flow</span>
        </div>
        
        {isTokenValidating ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '40px 0' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--cutout-border)', borderTopColor: 'var(--color-ui-element)', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Validating Invitation Token...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : tokenError ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '12px', fontSize: '15px', fontWeight: 600, marginBottom: '24px' }}>
              <span className="material-symbols-outlined" style={{ display: 'block', fontSize: '48px', marginBottom: '8px' }}>error</span>
              {tokenError}
            </div>
            <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-block', padding: '12px 24px', borderRadius: '12px', fontWeight: 600 }}>Go to Login</Link>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px', textAlign: 'center' }}>Accept Invitation</h2>
            <p className="text-secondary" style={{ fontSize: '15px', marginBottom: '32px', textAlign: 'center' }}>
              Complete your profile registration to join the organization.
            </p>

            <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {error && (
                <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '8px', fontSize: '13px', fontWeight: 500 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>First Name</label>
                  <div className="glass-cutout" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)', fontSize: '20px' }}>person</span>
                    <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange} placeholder="John" style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-ui-element)', width: '100%', fontSize: '15px', fontFamily: 'inherit' }} />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Last Name</label>
                  <div className="glass-cutout" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="text" name="lastName" required value={formData.lastName} onChange={handleChange} placeholder="Doe" style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-ui-element)', width: '100%', fontSize: '15px', fontFamily: 'inherit' }} />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Work Email</label>
                <div className="glass-cutout" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: inviteData?.email ? 'rgba(0,0,0,0.05)' : 'var(--cutout-bg)' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)', fontSize: '20px' }}>mail</span>
                  <input 
                    type="email" 
                    name="email" 
                    required 
                    readOnly={!!inviteData?.email}
                    value={formData.email} 
                    onChange={handleChange} 
                    placeholder="name@company.com" 
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: inviteData?.email ? 'var(--color-text-secondary)' : 'var(--color-ui-element)', width: '100%', fontSize: '15px', fontFamily: 'inherit' }} 
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Password</label>
                <div className="glass-cutout" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)', fontSize: '20px' }}>lock</span>
                  <input type="password" name="password" required value={formData.password} onChange={handleChange} placeholder="••••••••" style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-ui-element)', width: '100%', fontSize: '15px', fontFamily: 'inherit' }} />
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ width: '100%', padding: '16px', borderRadius: '12px', fontSize: '15px', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                {isLoading ? 'Accepting...' : 'Register and Join'} <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
              </button>
            </form>
          </>
        )}
      </div>

      <button onClick={onThemeToggle} className="btn btn-glass" style={{ position: 'absolute', top: '24px', right: '24px', width: '40px', height: '40px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Toggle Theme">
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
      </button>
    </div>
  );
}
