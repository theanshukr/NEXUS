import { useState } from 'react';
import { apiClient } from '../api/client';
import { Link } from 'react-router-dom';

export default function SignupPage({ theme, onThemeToggle }: { theme: 'light' | 'dark', onThemeToggle: () => void }) {
  const [mode, setMode] = useState<'organization'>('organization');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const [orgFormData, setOrgFormData] = useState({
    name: '',
    code: '',
    domain: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await apiClient.post('/organizations', orgFormData);
        setSuccess(response.data.message || 'Organization created successfully! You can now log in.');
        setOrgFormData({ name: '', code: '', domain: '', adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '' });
    } catch (err: any) {
      const errorData = err.response?.data?.error || err.response?.data;
      if (errorData?.details && Array.isArray(errorData.details)) {
        const messages = errorData.details.map((d: any) => d.message).join(' ');
        setError(messages);
      } else {
        setError(errorData?.message || 'Signup failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOrgFormData({ ...orgFormData, [e.target.name]: e.target.value });
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
        <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px', textAlign: 'center' }}>Create Workspace</h2>
        <p className="text-secondary" style={{ fontSize: '15px', marginBottom: '24px', textAlign: 'center' }}>
          Provision a new organization tenant.
        </p>

        {!success && (
          <div style={{ display: 'flex', padding: '12px 16px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px', marginBottom: '24px', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-accent)', flexShrink: 0 }}>info</span>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Joining an existing organization? Use your <Link to="/join" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>invitation link</Link>.
            </span>
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', borderRadius: '12px', fontSize: '15px', fontWeight: 600, marginBottom: '24px' }}>
              <span className="material-symbols-outlined" style={{ display: 'block', fontSize: '48px', marginBottom: '8px' }}>check_circle</span>
              {success}
            </div>
            <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-block', padding: '12px 24px', borderRadius: '12px', fontWeight: 600 }}>Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && (
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '8px', fontSize: '13px', fontWeight: 500 }}>
                {error}
              </div>
            )}
            
            {/* Organization form only — employee signup is via invitation link at /join */}
              <>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Organization Name</label>
                    <div className="glass-cutout" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)', fontSize: '20px' }}>business</span>
                      <input type="text" name="name" required value={orgFormData.name} onChange={handleChange} placeholder="Acme Corp" style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-ui-element)', width: '100%', fontSize: '15px', fontFamily: 'inherit' }} />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Org Code</label>
                    <div className="glass-cutout" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input type="text" name="code" required value={orgFormData.code} onChange={handleChange} placeholder="ACME" style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-ui-element)', width: '100%', fontSize: '15px', fontFamily: 'inherit' }} />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Primary Domain (Optional)</label>
                  <div className="glass-cutout" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)', fontSize: '20px' }}>language</span>
                    <input type="text" name="domain" value={orgFormData.domain} onChange={handleChange} placeholder="acmecorp.com" style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-ui-element)', width: '100%', fontSize: '15px', fontFamily: 'inherit' }} />
                  </div>
                </div>

                <div style={{ height: '1px', background: 'var(--glass-border-light)', margin: '8px 0' }}></div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Admin First Name</label>
                    <div className="glass-cutout" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)', fontSize: '20px' }}>person</span>
                      <input type="text" name="adminFirstName" required value={orgFormData.adminFirstName} onChange={handleChange} placeholder="Admin" style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-ui-element)', width: '100%', fontSize: '15px', fontFamily: 'inherit' }} />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Admin Last Name</label>
                    <div className="glass-cutout" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input type="text" name="adminLastName" required value={orgFormData.adminLastName} onChange={handleChange} placeholder="User" style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-ui-element)', width: '100%', fontSize: '15px', fontFamily: 'inherit' }} />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Admin Email</label>
                    <div className="glass-cutout" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)', fontSize: '20px' }}>mail</span>
                      <input type="email" name="adminEmail" required value={orgFormData.adminEmail} onChange={handleChange} placeholder="admin@acme.com" style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-ui-element)', width: '100%', fontSize: '15px', fontFamily: 'inherit' }} />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Admin Password</label>
                    <div className="glass-cutout" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)', fontSize: '20px' }}>lock</span>
                      <input type="password" name="adminPassword" required value={orgFormData.adminPassword} onChange={handleChange} placeholder="••••••••" style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-ui-element)', width: '100%', fontSize: '15px', fontFamily: 'inherit' }} />
                    </div>
                  </div>
                </div>
              </>

            <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ width: '100%', padding: '16px', borderRadius: '12px', fontSize: '15px', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              {isLoading ? 'Submitting...' : 'Create Organization'} <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>domain_add</span>
            </button>
            
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <span className="text-secondary" style={{ fontSize: '14px' }}>Already have an account? </span>
              <Link to="/login" style={{ fontSize: '14px', color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
            </div>
          </form>
        )}
      </div>
      
      <button onClick={onThemeToggle} className="btn btn-glass" style={{ position: 'absolute', top: '24px', right: '24px', width: '40px', height: '40px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Toggle Theme">
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
      </button>
    </div>
  );
}
