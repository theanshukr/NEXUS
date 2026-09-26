import { useState, useMemo, useEffect } from 'react';
import { useToast } from './ToastProvider';
import { apiClient } from '../api/client';
import NexusEmployeeProfileModal from './NexusEmployeeProfileModal';
import SkillGraph from './SkillGraph/SkillGraph';

interface EmployeeManagementViewProps {
  role: string;
  user?: any;
}

const EmployeeManagementView: React.FC<EmployeeManagementViewProps> = ({ role, user }) => {
  const [employees, setEmployees] = useState<any[]>([
    { id: 'EMP-001', name: 'Sarah Jenkins', title: 'Senior Frontend Engineer', department: 'Engineering', status: 'Active', location: 'San Francisco, CA' }
  ]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedEmployee, setSelectedEmployee] = useState(employees[0]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [showSkillGraph, setShowSkillGraph] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const filteredEmployees = useMemo(
    () => employees.filter(emp =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [employees, searchQuery]
  );
  const { showToast } = useToast();

  // Onboarding invite states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSelectedRoles, setInviteSelectedRoles] = useState<string[]>([]);
  const [inviteExpiresIn, setInviteExpiresIn] = useState(48);
  const [inviteMaxUses, setInviteMaxUses] = useState(1);
  const [inviteGenerating, setInviteGenerating] = useState(false);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Fetch roles list on modal open
  useEffect(() => {
    const fetchRoles = async () => {
      if (showInviteModal && rolesList.length === 0) {
        try {
          const res = await apiClient.get('/roles');
          if (res.data?.success && Array.isArray(res.data.data)) {
            setRolesList(res.data.data);
          }
        } catch (e) {
          console.error('Failed to fetch roles', e);
        }
      }
    };
    fetchRoles();
  }, [showInviteModal, rolesList.length]);

  const renderInviteModal = () => {
    const handleInviteSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (inviteSelectedRoles.length === 0) {
        setInviteError('Please select at least one default role.');
        return;
      }
      setInviteGenerating(true);
      setInviteError('');
      try {
        const res = await apiClient.post('/invites', {
          email: inviteEmail.trim() || undefined,
          roleIds: inviteSelectedRoles,
          expiresInHours: Number(inviteExpiresIn),
          maxUses: Number(inviteMaxUses)
        });
        if (res.data?.success) {
          setGeneratedInviteUrl(res.data.data.inviteUrl || `${window.location.origin}/join?token=${res.data.data.token}`);
          showToast('Success', 'success', 'Onboarding invitation link generated successfully.');
        }
      } catch (err: any) {
        console.error('Invite generation failed', err);
        setInviteError(err.response?.data?.error?.message || 'Failed to generate invitation link.');
      } finally {
        setInviteGenerating(false);
      }
    };

    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '20px', animation: 'fadeIn 0.2s ease-out'
      }}>
        <div className="glass-panel" style={{
          width: '100%', maxWidth: '540px', padding: '32px',
          maxHeight: '90vh', overflowY: 'auto', position: 'relative'
        }}>
          <button
            onClick={() => setShowInviteModal(false)}
            style={{
              position: 'absolute', top: '20px', right: '20px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-secondary)', display: 'flex'
            }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>

          <h3 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: 800 }}>Onboard New Employee</h3>
          <p className="text-secondary" style={{ fontSize: '14px', marginBottom: '24px' }}>
            Generate a secure cryptographic invitation link for a new hire.
          </p>

          {inviteError && (
            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '8px', fontSize: '13px', fontWeight: 500, marginBottom: '16px' }}>
              {inviteError}
            </div>
          )}

          {generatedInviteUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '8px' }}>Invitation URL Generated:</span>
                <div className="glass-cutout" style={{ padding: '12px', wordBreak: 'break-all', fontSize: '14px', fontFamily: '"Fira Code", monospace', color: 'var(--color-ui-element)' }}>
                  {generatedInviteUrl}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={() => {
                    navigator.clipboard.writeText(generatedInviteUrl);
                    showToast('Copied', 'info', 'Link copied to clipboard.');
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>content_copy</span> Copy Link
                </button>
                <button
                  className="btn btn-glass"
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', fontWeight: 600 }}
                  onClick={() => setShowInviteModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleInviteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Invitee Email (Optional)</label>
                <div className="glass-cutout" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)', fontSize: '20px' }}>mail</span>
                  <input
                    type="email"
                    placeholder="newhire@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-ui-element)', width: '100%', fontSize: '14px', fontFamily: 'inherit' }}
                  />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'block' }}>If set, only this email can redeem the link. If blank, anyone with the link can sign up.</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Default Roles (Required)</label>
                <div className="glass-cutout" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '150px', overflowY: 'auto' }}>
                  {rolesList.length === 0 ? (
                    <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Loading roles...</span>
                  ) : (
                    rolesList.map((r) => (
                      <label key={r._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                        <input
                          type="checkbox"
                          checked={inviteSelectedRoles.includes(r._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setInviteSelectedRoles([...inviteSelectedRoles, r._id]);
                            } else {
                              setInviteSelectedRoles(inviteSelectedRoles.filter((id) => id !== r._id));
                            }
                          }}
                        />
                        {r.name}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Expires In (Hours)</label>
                  <div className="glass-cutout" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="number"
                      min="1"
                      value={inviteExpiresIn}
                      onChange={(e) => setInviteExpiresIn(Number(e.target.value))}
                      style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-ui-element)', width: '100%', fontSize: '14px', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Max Usage Limit</label>
                  <div className="glass-cutout" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="number"
                      min="1"
                      value={inviteMaxUses}
                      onChange={(e) => setInviteMaxUses(Number(e.target.value))}
                      style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-ui-element)', width: '100%', fontSize: '14px', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={inviteGenerating}
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '8px' }}
              >
                {inviteGenerating ? 'Generating...' : 'Generate Invite Link'} <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>link</span>
              </button>
            </form>
          )}
        </div>
      </div>
    );
  };

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/employees?limit=100');
      const rawList = res.data?.data?.data || res.data?.data?.items || (Array.isArray(res.data?.data) ? res.data?.data : []);
      if (rawList && rawList.length > 0) {
        const mapped = rawList.map((emp: any) => ({
          id: emp.employeeCode || emp._id,
          name: `${emp.firstName} ${emp.lastName}`,
          title: emp.designationId?.name || emp.designationId?.title || emp.designation?.name || 'Software Engineer',
          department: emp.departmentId?.name || emp.department?.name || 'Engineering',
          status: emp.status === 'ACTIVE' ? 'Active' : emp.status === 'ONBOARDING' ? 'Onboarding' : emp.status || 'Active',
          location: emp.locationId?.name || emp.location?.name || 'India (Hybrid)',
          raw: emp // keep raw for detailed view
        }));
        setEmployees(mapped);
        if (mapped.length > 0) setSelectedEmployee(mapped[0]);
      }
    } catch (err) {
      console.error('Failed to fetch employees', err);
      showToast('Error', 'error', 'Failed to load employees from server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [showToast]);

  // --- Modal States & Functions ---
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showOffboardingModal, setShowOffboardingModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [onboardingForm, setOnboardingForm] = useState<{ employeeCode: string; firstName: string; lastName: string; workEmail: string; joiningDate: string; departmentId: string; designationId: string; locationId: string; shiftId: string; skills: Array<{ name: string; proficiency: string; yearsOfExperience: number; }>; }>({ employeeCode: '', firstName: '', lastName: '', workEmail: '', joiningDate: '', departmentId: '', designationId: '', locationId: '', shiftId: '', skills: [{ name: '', proficiency: 'Intermediate', yearsOfExperience: 1 }] });
  const [offboardingForm, setOffboardingForm] = useState({ employeeId: '', reason: '' });
  
  const [designations, setDesignations] = useState<any[]>([]);
  const [availableSkills, setAvailableSkills] = useState<any[]>([]);
  const [focusedSkillIndex, setFocusedSkillIndex] = useState<number | null>(null);
  const [fullProfile, setFullProfile] = useState<any>(null);
  const [selectedEmpIdForProfile, setSelectedEmpIdForProfile] = useState<string>('');
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const fetchOptions = async () => {
    apiClient.get('/designations').then(res => {
      const desPayload = res.data?.data;
      const list = Array.isArray(desPayload) ? desPayload : (desPayload?.data || desPayload?.docs || []);
      if (list.length > 0) setDesignations(list);
    }).catch(err => console.error('Failed to fetch designations', err));

    apiClient.get('/nexus/skills').then(res => {
      const skillsPayload = res.data?.data;
      const list = Array.isArray(skillsPayload) ? skillsPayload : (skillsPayload?.data || skillsPayload?.docs || []);
      if (list.length > 0) setAvailableSkills(list);
    }).catch(err => console.error('Failed to fetch skills', err));

    apiClient.get('/departments').catch(() => null);
    apiClient.get('/locations').catch(() => null);
    apiClient.get('/shifts').catch(() => null);
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    if (showOnboardingModal) {
      fetchOptions();
      setOnboardingForm(prev => ({
        ...prev,
        employeeCode: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        skills: prev.skills.length > 0 ? prev.skills : [{ name: '', proficiency: 'Intermediate', yearsOfExperience: 1 }]
      }));
    }
  }, [showOnboardingModal]);

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Backend expects joiningDate in ISO format, datetime-local provides YYYY-MM-DDTHH:mm
      const payload = { ...onboardingForm, joiningDate: new Date(onboardingForm.joiningDate).toISOString() };
        delete (payload as any).departmentId;
        delete (payload as any).locationId;
        delete (payload as any).shiftId;
      await apiClient.post('/employees', payload);
      showToast('Success', 'success', 'Employee successfully onboarded!');
      setShowOnboardingModal(false);
      fetchEmployees();
    } catch (err: any) {
      showToast('Error', 'error', err.response?.data?.message || 'Failed to onboard employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOffboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offboardingForm.employeeId) return;
    setIsSubmitting(true);
    try {
      await apiClient.post(`/employees/${offboardingForm.employeeId}/archive`, { reason: offboardingForm.reason });
      showToast('Success', 'success', 'Employee offboarded successfully!');
      setShowOffboardingModal(false);
      fetchEmployees();
    } catch (err: any) {
      showToast('Error', 'error', err.response?.data?.message || 'Failed to offboard employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewProfile = async (empId: string) => {
    setSelectedEmpIdForProfile(empId);
    setShowProfileModal(true);
    setIsProfileLoading(true);
    try {
      const res = await apiClient.get(`/nexus/employees/${empId}/profile`);
      if (res.data?.success && res.data?.data) {
        setFullProfile(res.data.data);
      } else {
        const fallbackRes = await apiClient.get(`/employees/${empId}`);
        setFullProfile({ employee: fallbackRes.data?.data, intelligence: {} });
      }
    } catch (err) {
      try {
        const fallbackRes = await apiClient.get(`/employees/${empId}`);
        setFullProfile({ employee: fallbackRes.data?.data, intelligence: {} });
      } catch (e) {
        console.error('Failed to load profile', e);
      }
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleForceLogout = async (id: string) => {
    try {
      await apiClient.post(`/users/${id}/revoke-tokens`);
      showToast('Success', 'success', 'User tokens revoked. They have been logged out.');
    } catch (err: any) {
      showToast('Error', 'error', err.response?.data?.error || 'Failed to force logout');
    }
  };

  const handleSuspendAccount = async (id: string) => {
    try {
      await apiClient.patch(`/users/${id}/suspend`);
      showToast('Success', 'success', 'User account suspended.');
    } catch (err: any) {
      showToast('Error', 'error', err.response?.data?.error || 'Failed to suspend account');
    }
  };

  const handleResetPassword = async (id: string) => {
    try {
      await apiClient.post(`/users/${id}/reset-password`);
      showToast('Success', 'success', 'Password reset email sent to user.');
    } catch (err: any) {
      showToast('Error', 'error', err.response?.data?.error || 'Failed to initiate password reset');
    }
  };

  const handleExport = () => {
    // ... logic for export
  };

  // Specific to Employee Self-Service
  const [onboardingItems, setOnboardingItems] = useState([
    { task: 'Complete I-9 Form', status: 'Done' },
    { task: 'Setup IT Assets (Laptop, YubiKey)', status: 'Pending' },
    { task: 'Read and Acknowledge Code of Conduct', status: 'Done' },
    { task: 'First 1:1 with Manager', status: 'Pending' },
  ]);

  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [profilePhone, setProfilePhone] = useState('+1 (555) 123-4567');
  const [profileLocation, setProfileLocation] = useState('San Francisco, CA (Hybrid)');

  const toggleOnboardingStatus = (index: number) => {
    const newItems = [...onboardingItems];
    newItems[index].status = newItems[index].status === 'Done' ? 'Pending' : 'Done';
    setOnboardingItems(newItems);
  };

  const renderEmployeeSelfService = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px', position: 'relative' }}>
      
      <div style={{ gridColumn: 'span 2' }}>
        <div className="glass-panel" style={{ padding: '40px', position: 'relative', overflow: 'hidden' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '40px' }}>
            <div style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              background: 'var(--nav-active-bg)',
              border: '2px solid var(--cutout-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              color: 'var(--color-primary)',
              fontWeight: 800,
              boxShadow: '0 4px 16px var(--glass-shadow)',
              letterSpacing: '-0.5px'
            }}>
              {user ? user.firstName?.[0] : 'S'}{user ? user.lastName?.[0] : 'J'}
            </div>
            <div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 800, color: 'var(--color-primary)' }}>{user ? `${user.firstName} ${user.lastName}` : 'Sarah Jenkins'}</h2>
              <p style={{ margin: 0, color: 'var(--color-ui-element)', fontSize: '16px', fontWeight: 500 }}>{user?.roles?.[0] || 'Employee'}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
            {/* Stat Cards */}
            {[
              { icon: 'mail', label: 'Email Address', value: user?.email || 'sarah.jenkins@company.com' },
              { icon: 'call', label: 'Phone Number', value: profilePhone },
              { icon: 'location_on', label: 'Location', value: profileLocation },
              { icon: 'badge', label: 'Employee ID', value: user?.employeeCode || 'EMP-001' }
            ].map((stat, i) => (
              <div key={i} className="glass-cutout" style={{ padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '16px', border: '1px solid var(--cutout-border)', transition: 'transform 0.2s', cursor: 'default' }} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.02)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--nav-active-bg)', color: 'var(--color-ui-element)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--cutout-border)' }}>
                  <span className="material-symbols-outlined">{stat.icon}</span>
                </div>
                <div>
                  <div className="text-metadata" style={{ marginBottom: '4px' }}>{stat.label}</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-primary)' }}>{stat.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={() => {
                const empId = user?.employeeId || employees[0]?.raw?._id || employees[0]?.id;
                if (empId) handleViewProfile(empId);
              }}
              className="btn btn-primary"
              style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>auto_awesome</span>
              View Nexus Intelligence Profile
            </button>
            <button onClick={() => setShowEditProfileModal(true)} className="btn btn-glass" style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      <div style={{ gridColumn: 'span 1' }}>
        <div className="glass-panel" style={{ padding: '32px', height: '100%' }}>
          <h3 style={{ margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px', fontWeight: 800, color: 'var(--color-primary)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--nav-active-bg)', color: 'var(--color-ui-element)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--cutout-border)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>checklist</span>
            </div>
            Onboarding Checklist
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {onboardingItems.map((item, index) => (
              <div key={index} onClick={() => toggleOnboardingStatus(index)} className="glass-cutout" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: '1px solid var(--cutout-border)', transition: 'all 0.2s', cursor: 'pointer' }} onMouseEnter={e=>{e.currentTarget.style.background='var(--nav-active-bg)'; e.currentTarget.style.transform='translateX(4px)'}} onMouseLeave={e=>{e.currentTarget.style.background='var(--cutout-bg)'; e.currentTarget.style.transform='translateX(0)'}}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: item.status === 'Done' ? 'rgba(16, 185, 129, 0.15)' : 'var(--nav-active-bg)', color: item.status === 'Done' ? 'var(--color-accent)' : 'var(--color-text-secondary)', border: item.status === 'Done' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--cutout-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    {item.status === 'Done' ? 'check' : ''}
                  </span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: item.status === 'Done' ? 'var(--color-text-secondary)' : 'var(--color-primary)', textDecoration: item.status === 'Done' ? 'line-through' : 'none', transition: 'all 0.3s' }}>
                  {item.task}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div style={{ gridColumn: 'span 3' }}>
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--cutout-border)', background: 'var(--cutout-bg)' }}>
            {[
              { id: 'personal', label: 'Personal Details', icon: 'person' },
              { id: 'employment', label: 'Employment Details', icon: 'work' },
              { id: 'skills', label: 'Skills & Certifications', icon: 'workspace_premium' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '20px 32px', background: 'transparent', border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', opacity: activeTab === tab.id ? 1 : 0.7 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '32px' }}>
            {activeTab === 'personal' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="glass-cutout" style={{ padding: '24px', border: '1px solid var(--cutout-border)' }}>
                  <h4 className="text-metadata" style={{ marginBottom: '16px' }}>Basic Info</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>Date of Birth</span><span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Jan 15, 1990</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>Gender</span><span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Female</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>Nationality</span><span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>American</span></div>
                  </div>
                </div>
                <div className="glass-cutout" style={{ padding: '24px', border: '1px solid var(--cutout-border)' }}>
                  <h4 className="text-metadata" style={{ marginBottom: '16px' }}>Emergency Contact</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>Name</span><span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Michael Jenkins</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>Relationship</span><span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Spouse</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>Phone</span><span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>+1 (555) 987-6543</span></div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'employment' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="glass-cutout" style={{ padding: '24px', border: '1px solid var(--cutout-border)' }}>
                  <h4 className="text-metadata" style={{ marginBottom: '16px' }}>Job Information</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>Department</span><span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{user?.departmentId?.name || 'Engineering'}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>Designation</span><span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{user?.designationId?.name || 'Senior Frontend Engineer'}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>Manager</span><span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Alex Rivera</span></div>
                  </div>
                </div>
                <div className="glass-cutout" style={{ padding: '24px', border: '1px solid var(--cutout-border)' }}>
                  <h4 className="text-metadata" style={{ marginBottom: '16px' }}>Tenure</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>Hire Date</span><span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>March 12, 2024</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>Employment Type</span><span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Full-Time</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>Status</span><span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>Active</span></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'skills' && (
              <div className="glass-cutout" style={{ padding: '24px', border: '1px solid var(--cutout-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>Technical Skills</h4>
                  <button className="btn btn-glass" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => showToast('Skill Addition', 'success', 'Request to add skill submitted')}>+ Add Skill</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {['React', 'TypeScript', 'Node.js', 'GraphQL', 'AWS', 'Figma', 'System Architecture'].map(skill => (
                    <div key={skill} style={{ padding: '8px 16px', background: 'var(--nav-active-bg)', color: 'var(--color-ui-element)', border: '1px solid var(--cutout-border)', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>
                      {skill}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showEditProfileModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '450px', padding: '32px', border: '1px solid var(--cutout-border)' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)' }}>Edit Profile</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Phone Number</label>
                <input type="text" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} className="form-input" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Location</label>
                <input type="text" value={profileLocation} onChange={e => setProfileLocation(e.target.value)} className="form-input" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px' }}>
              <button onClick={() => setShowEditProfileModal(false)} className="btn btn-glass" style={{ padding: '10px 20px' }}>Cancel</button>
              <button onClick={() => { setShowEditProfileModal(false); showToast('Success', 'success', 'Profile updated successfully!'); }} className="btn btn-primary" style={{ padding: '10px 24px' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderHRManagerView = () => {
    return (
    <div className="glass-panel" style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '16px', fontSize: '28px', fontWeight: 800 }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>badge</span>
          </div>
          Employee Directory
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-primary"
            style={{ padding: '12px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setShowSkillGraph(true)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>hub</span>
            Skill Graph
          </button>
          <button
            className="btn btn-primary"
            style={{ padding: '12px 20px', borderRadius: '12px', background: '#8b5cf6', borderColor: '#8b5cf6', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => window.location.href = '/skill-graph/hr'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>insights</span>
            Workforce Intelligence
          </button>
          <button
            style={{ padding: '12px 24px', background: '#38bdf8', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(56,189,248,0.4)' }}
            onClick={() => setShowOnboardingModal(true)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person_add</span>
            Initiate Onboarding
          </button>
          <button
            className="btn btn-glass" style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setShowOffboardingModal(true)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person_remove</span>
            Offboarding
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-cutout" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)', fontSize: '20px' }}>search</span>
        <input
          type="text"
          placeholder="Search by name, department, title or ID..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: 'var(--color-ui-element)', fontFamily: 'inherit' }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', padding: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        )}
      </div>

      <div className="glass-cutout" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--color-glass-surface)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid var(--glass-border-light)' }}>
              <th style={{ padding: '16px 24px', fontWeight: 700, fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Employee</th>
              <th style={{ padding: '16px 24px', fontWeight: 700, fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Title</th>
              <th style={{ padding: '16px 24px', fontWeight: 700, fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Department</th>
              <th style={{ padding: '16px 24px', fontWeight: 700, fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th>
              <th style={{ padding: '16px 24px', fontWeight: 700, fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} style={{ padding: '80px 24px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ position: 'absolute', inset: 0, background: '#38bdf8', filter: 'blur(24px)', opacity: 0.15, borderRadius: '50%', animation: 'skeletonPulse 3s infinite ease-in-out' }}></div>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Loading Directory...</h3>
                  </div>
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '80px 24px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>No employees found</h3>
                    <p style={{ margin: '8px 0 24px 0', fontSize: '15px', color: 'var(--color-text-secondary)', maxWidth: '300px', lineHeight: 1.5 }}>
                      We couldn't find anyone matching &quot;<strong>{searchQuery}</strong>&quot;. Try adjusting your search criteria.
                    </p>
                    <button className="btn btn-glass" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setSearchQuery('')}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>clear_all</span>
                      Clear Search
                    </button>
                  </div>
                </td>
              </tr>
            ) : filteredEmployees.map((emp) => (
              <tr key={emp.id} style={{ borderTop: '1px solid var(--cutout-bg)', transition: 'all 0.2s', cursor: 'pointer' }} onMouseEnter={e=>e.currentTarget.style.background='var(--glass-border-light)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--nav-active-bg)', border: '1px solid var(--cutout-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: 'var(--color-primary)', fontWeight: 700, boxShadow: '0 2px 8px var(--glass-shadow)' }}>
                      {emp.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>{emp.name}</div>
                      <div style={{ fontSize: '12px', opacity: 0.6, fontFamily: '"Fira Code", monospace' }}>{emp.id}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 500 }}>{emp.title}</td>
                <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 500 }}>{emp.department}</td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ 
                    padding: '6px 12px', 
                    borderRadius: '20px', 
                    fontSize: '11px', 
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: emp.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: emp.status === 'Active' ? '#10b981' : '#f59e0b',
                    border: `1px solid ${emp.status === 'Active' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                  }}>
                    {emp.status}
                  </span>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <button
                    className="btn btn-glass" style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleViewProfile(emp.raw?._id || emp.raw?.id || emp.id)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-ui-element)' }}>visibility</span>
                    View Profile
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    );
  };

  const renderITAdminView = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '32px' }}>
      <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
        <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 800 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--nav-active-bg)', color: 'var(--color-ui-element)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--cutout-border)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>search</span>
          </div>
          Select User
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {employees.map(emp => {
            const isSelected = selectedEmployee?.id === emp.id;
            return (
              <div 
                key={emp.id} 
                onClick={() => setSelectedEmployee(emp)}
                style={{ 
                  padding: '12px 16px', 
                  borderRadius: '16px', 
                  cursor: 'pointer',
                  background: isSelected ? 'var(--color-background-base)' : 'var(--color-glass-surface)',
                  border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--cutout-border)',
                  boxShadow: isSelected ? '0 4px 16px var(--glass-shadow)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background = 'var(--cutout-border)' }}
                onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background = 'var(--color-glass-surface)' }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isSelected ? 'var(--color-primary)' : 'var(--cutout-bg)', color: isSelected ? 'var(--color-background-base)' : 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>person</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{emp.name}</div>
                  <div style={{ fontSize: '12px', opacity: 0.6 }}>{emp.department}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '40px' }}>
        <h2 style={{ margin: '0 0 32px 0', display: 'flex', alignItems: 'center', gap: '16px', fontSize: '28px', fontWeight: 800 }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--nav-active-bg)', color: 'var(--color-ui-element)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--cutout-border)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>devices</span>
          </div>
          Hardware & Software Assets
        </h2>
        
        {selectedEmployee ? (
          <>
            <div style={{ background: 'var(--cutout-bg)', padding: '24px', borderRadius: '20px', border: '1px solid var(--cutout-border)', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
                 <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--nav-active-bg)', border: '2px solid var(--cutout-border)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', boxShadow: '0 4px 16px var(--glass-shadow)' }}>
                    {selectedEmployee.name.split(' ').map((n: string) => n[0]).join('')}
                 </div>
                 <div>
                   <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>{selectedEmployee.name}</h3>
                   <p style={{ margin: 0, opacity: 0.7, fontSize: '15px', fontFamily: '"Fira Code", monospace' }}>Asset Profile: {selectedEmployee.id}</p>
                 </div>
              </div>
              
              <h4 style={{ margin: '0 0 16px 0', fontSize: '12px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Hardware Issued</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                 <div className="glass-cutout" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                     <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--cutout-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <span className="material-symbols-outlined" style={{ color: '#4b5563' }}>laptop_mac</span>
                     </div>
                     <div>
                       <div style={{ fontSize: '15px', fontWeight: 700 }}>MacBook Pro 16" (M2 Max)</div>
                       <div style={{ fontSize: '13px', opacity: 0.7, fontFamily: '"Fira Code", monospace' }}>Tag: LPT-4921 • Issued: 10/12/2023</div>
                     </div>
                   </div>
                   <button onClick={() => showToast('Asset revocation is in development', 'info')} style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,0.1)'}>Revoke</button>
                 </div>
                 
                 <div className="glass-cutout" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                     <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--cutout-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <span className="material-symbols-outlined" style={{ color: '#4b5563' }}>usb</span>
                     </div>
                     <div>
                       <div style={{ fontSize: '15px', fontWeight: 700 }}>YubiKey 5 NFC</div>
                       <div style={{ fontSize: '13px', opacity: 0.7, fontFamily: '"Fira Code", monospace' }}>Tag: SEC-991 • Issued: 10/12/2023</div>
                     </div>
                   </div>
                   <button onClick={() => showToast('Asset revocation is in development', 'info')} style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,0.1)'}>Revoke</button>
                 </div>
              </div>

              <h4 style={{ margin: '0 0 16px 0', fontSize: '12px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Software Licenses</h4>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                 <span style={{ padding: '8px 16px', background: 'var(--glass-border-light)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '20px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}><span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#38bdf8' }}>code</span> GitHub Copilot</span>
                 <span style={{ padding: '8px 16px', background: 'var(--glass-border-light)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '20px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}><span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#f59e0b' }}>design_services</span> Figma Professional</span>
                 <span style={{ padding: '8px 16px', background: 'var(--glass-border-light)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '20px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}><span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#10b981' }}>cloud</span> AWS Dev Sandbox</span>
              </div>
            </div>
            
            <button onClick={() => {
              const assetId = prompt('Enter Asset ID to provision:');
              if (assetId) showToast('Success', 'success', `Asset ${assetId} provisioned to employee.`);
            }} style={{ width: '100%', padding: '16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
              <span className="material-symbols-outlined">add</span> Provision New Asset
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '64px', color: 'var(--color-text-secondary)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>devices</span>
            <p>Select an employee to view their hardware and software assets.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderFinanceView = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '32px' }}>
      <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
        <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 800 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>search</span>
          </div>
          Select User
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {employees.map(emp => {
            const isSelected = selectedEmployee.id === emp.id;
            return (
              <div 
                key={emp.id} 
                onClick={() => setSelectedEmployee(emp)}
                style={{ 
                  padding: '12px 16px', 
                  borderRadius: '16px', 
                  cursor: 'pointer',
                  background: isSelected ? 'var(--color-background-base)' : 'var(--color-glass-surface)',
                  border: isSelected ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.6)',
                  boxShadow: isSelected ? '0 4px 16px rgba(16,185,129,0.15)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background = 'var(--cutout-border)' }}
                onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background = 'var(--color-glass-surface)' }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isSelected ? '#10b981' : 'var(--cutout-bg)', color: isSelected ? '#fff' : 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>person</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{emp.name}</div>
                  <div style={{ fontSize: '12px', opacity: 0.6 }}>{emp.department}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '40px' }}>
        <h2 style={{ margin: '0 0 32px 0', display: 'flex', alignItems: 'center', gap: '16px', fontSize: '28px', fontWeight: 800 }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>account_balance</span>
          </div>
          Payroll & Tax Profile
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
          <div className="glass-cutout" style={{ padding: '24px', border: '1px solid rgba(16,185,129,0.3)', boxShadow: '0 8px 24px rgba(16,185,129,0.1)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <span className="material-symbols-outlined">payments</span>
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6, fontWeight: 700 }}>Base Salary (Annual)</h3>
            <p style={{ margin: 0, fontSize: '32px', fontWeight: 800, color: 'var(--color-ui-element)' }}>$165,000</p>
          </div>
          <div className="glass-cutout" style={{ padding: '24px', border: '1px solid rgba(245,158,11,0.3)', boxShadow: '0 8px 24px rgba(245,158,11,0.1)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <span className="material-symbols-outlined">percent</span>
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6, fontWeight: 700 }}>Equity / Bonus</h3>
            <p style={{ margin: 0, fontSize: '32px', fontWeight: 800, color: 'var(--color-ui-element)' }}>15% Target</p>
          </div>
        </div>

        <div style={{ background: 'var(--cutout-bg)', padding: '32px', borderRadius: '20px', border: '1px solid var(--cutout-border)', marginBottom: '32px' }}>
          <h4 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>account_balance_wallet</span> 
            </div>
            Direct Deposit Information
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="glass-cutout" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>Bank Name</div>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>Chase Bank</div>
            </div>
            <div className="glass-cutout" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>Account Type</div>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>Checking</div>
            </div>
            <div className="glass-cutout" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>Routing Number</div>
              <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: '"Fira Code", monospace' }}>******123</div>
            </div>
            <div className="glass-cutout" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>Account Number</div>
              <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: '"Fira Code", monospace' }}>********4567</div>
            </div>
          </div>
        </div>
        
        <div style={{ background: 'var(--cutout-bg)', padding: '32px', borderRadius: '20px', border: '1px solid var(--cutout-border)' }}>
           <h4 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>receipt_long</span> 
            </div>
            Tax Compliance
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: 'var(--glass-border-light)', borderRadius: '16px', border: '1px solid rgba(16,185,129,0.3)', boxShadow: '0 4px 12px rgba(16,185,129,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(16,185,129,0.4)' }}>
                <span className="material-symbols-outlined">check</span>
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>W-4 Form</div>
                <div style={{ fontSize: '13px', opacity: 0.6, fontFamily: '"Fira Code", monospace' }}>Last Updated: 01/15/2024</div>
              </div>
            </div>
            <button style={{ padding: '10px 20px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>View PDF</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSuperAdminView = () => (
     <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '32px' }}>
       <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
        <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 800 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>search</span>
          </div>
          System Users
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {employees.map(emp => {
            const isSelected = selectedEmployee.id === emp.id;
            return (
              <div 
                key={emp.id} 
                onClick={() => setSelectedEmployee(emp)}
                style={{ 
                  padding: '12px 16px', 
                  borderRadius: '16px', 
                  cursor: 'pointer',
                  background: isSelected ? 'var(--color-background-base)' : 'var(--color-glass-surface)',
                  border: isSelected ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.6)',
                  boxShadow: isSelected ? '0 4px 16px rgba(239,68,68,0.15)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background = 'var(--cutout-border)' }}
                onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background = 'var(--color-glass-surface)' }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isSelected ? '#ef4444' : 'var(--cutout-bg)', color: isSelected ? '#fff' : 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>person</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{emp.name}</div>
                  <div style={{ fontSize: '12px', opacity: 0.6, fontFamily: '"Fira Code", monospace' }}>ID: {emp.id}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '16px', fontSize: '28px', fontWeight: 800 }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>admin_panel_settings</span>
            </div>
            System Metadata & Auth Override
          </h2>
          <button
            style={{ padding: '12px 24px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(239,68,68,0.4)' }}
            onClick={() => {
              setGeneratedInviteUrl('');
              setInviteEmail('');
              setInviteSelectedRoles([]);
              setInviteError('');
              setShowInviteModal(true);
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person_add</span>
            Initiate Onboarding
          </button>
        </div>

        <div style={{ background: 'rgba(239,68,68,0.05)', padding: '32px', borderRadius: '20px', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '32px' }}>
          <h4 style={{ margin: '0 0 24px 0', fontSize: '16px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 800 }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(239,68,68,0.4)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>warning</span>
            </div>
            DANGER ZONE
          </h4>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button onClick={() => handleForceLogout(selectedEmployee.id)} style={{ padding: '12px 24px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(239,68,68,0.4)' }}>Force Logout (Revoke Tokens)</button>
            <button onClick={() => handleSuspendAccount(selectedEmployee.id)} style={{ padding: '12px 24px', background: 'var(--glass-border-light)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Suspend Account</button>
            <button onClick={() => handleResetPassword(selectedEmployee.id)} style={{ padding: '12px 24px', background: 'var(--glass-border-light)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Reset Password</button>
          </div>
        </div>

        <div style={{ background: 'var(--cutout-bg)', padding: '32px', borderRadius: '20px', border: '1px solid var(--cutout-border)' }}>
           <h4 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(15,23,42,0.1)', color: 'var(--color-ui-element)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>data_object</span> 
            </div>
            Raw User Entity
          </h4>
          <pre style={{ margin: 0, background: '#0f172a', color: '#e2e8f0', padding: '24px', borderRadius: '16px', overflowX: 'auto', fontSize: '13px', fontFamily: '"Fira Code", monospace', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)' }}>
            <code>
{`{
  "uuid": "a8f93j-19kf2-10f8-b420-19xk204m10",
  "employeeId": "${selectedEmployee.id}",
  "displayName": "${selectedEmployee.name}",
  "email": "${selectedEmployee.name.split(' ')[0].toLowerCase()}@company.com",
  "roles": ["Standard Employee", "Engineering Read"],
  "lastLogin": "2024-03-12T08:42:12Z",
  "loginIp": "192.168.1.42",
  "mfaEnabled": true,
  "tenantId": "TN-4912"
}`}
            </code>
          </pre>
        </div>
      </div>
     </div>
  );

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out', position: 'relative', minHeight: '600px' }}>
      {/* Ambient background blobs for glassmorphism */}
      <div style={{ position: 'absolute', top: '5%', right: '10%', width: '400px', height: '400px', background: 'var(--color-blob-1)', filter: 'blur(100px)', borderRadius: '50%', opacity: 0.25, pointerEvents: 'none', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', bottom: '10%', left: '5%', width: '300px', height: '300px', background: 'var(--color-blob-2)', filter: 'blur(100px)', borderRadius: '50%', opacity: 0.2, pointerEvents: 'none', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', top: '40%', left: '40%', width: '200px', height: '200px', background: 'var(--color-blob-1)', filter: 'blur(80px)', borderRadius: '50%', opacity: 0.1, pointerEvents: 'none', zIndex: 0 }}></div>
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        {!(role === 'HR Manager' && showSkillGraph) && <header style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', letterSpacing: '-1px' }}>
          {role === 'HR Manager' ? 'Directory' : 'Employee Profile'}
        </h1>
        <p style={{ margin: 0, opacity: 0.7, fontSize: '16px' }}>
          {role === 'Standard Employee' && 'Manage your personal information and onboarding tasks.'}
          {role === 'HR Manager' && 'Manage employee lifecycles and detailed profiles.'}
          {role === 'IT Admin' && 'Manage hardware and software provisioning.'}
          {role === 'Finance Executive' && 'Review compensation and tax compliance data.'}
          {role === 'Super Admin' && 'System-level user metadata and authentication controls.'}
          {role === 'Administrator' && 'Manage hardware and software provisioning.'} {/* Administrator mapped to IT Admin view for now */}
        </p>
        </header>}

      {role === 'Standard Employee' && renderEmployeeSelfService()}
      {role === 'HR Manager' && (showSkillGraph ? <SkillGraph onBack={() => setShowSkillGraph(false)} /> : renderHRManagerView())}
      {(role === 'IT Admin' || role === 'Administrator') && renderITAdminView()}
      {role === 'Finance Executive' && renderFinanceView()}
      {role === 'Super Admin' && renderSuperAdminView()}

      {/* --- Modals --- */}
      {showOnboardingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 800 }}>Initiate Onboarding</h3>
            <form onSubmit={handleOnboardingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>First Name *</label>
                  <input required type="text" value={onboardingForm.firstName} onChange={e => setOnboardingForm({...onboardingForm, firstName: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', color: 'var(--color-text)', border: '1px solid var(--glass-border-light)', borderRadius: '12px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Last Name *</label>
                  <input required type="text" value={onboardingForm.lastName} onChange={e => setOnboardingForm({...onboardingForm, lastName: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', color: 'var(--color-text)', border: '1px solid var(--glass-border-light)', borderRadius: '12px', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Employee Code *</label>
                  <input required type="text" value={onboardingForm.employeeCode} onChange={e => setOnboardingForm({...onboardingForm, employeeCode: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', color: 'var(--color-text)', border: '1px solid var(--glass-border-light)', borderRadius: '12px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Work Email</label>
                  <input type="email" value={onboardingForm.workEmail} onChange={e => setOnboardingForm({...onboardingForm, workEmail: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', color: 'var(--color-text)', border: '1px solid var(--glass-border-light)', borderRadius: '12px', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Joining Date *</label>
                <input required type="date" value={onboardingForm.joiningDate} onChange={e => setOnboardingForm({...onboardingForm, joiningDate: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', color: 'var(--color-text)', border: '1px solid var(--glass-border-light)', borderRadius: '12px', outline: 'none', colorScheme: 'dark' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Role *</label>
                <select required value={onboardingForm.designationId} onChange={e => setOnboardingForm({...onboardingForm, designationId: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', color: 'var(--color-text)', border: '1px solid var(--glass-border-light)', borderRadius: '12px', outline: 'none' }}>
                  <option value="" disabled style={{ color: '#64748b', background: '#1e293b' }}>Select Role</option>
                  {designations.map(d => <option key={d._id} value={d._id} style={{ color: '#ffffff', background: '#1e293b' }}>{d.title || d.name}</option>)}
                </select>
              </div>
              {/* Skills & Experience */}
              <div style={{ paddingBottom: '160px' }}>
                <div style={{ marginTop: '10px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Skills & Experience</h4>
                  {onboardingForm.skills.map((skill, index) => (
                    <div key={index} style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: 2 }}>
                        <input 
                          type="text" 
                          placeholder="Search skill (e.g. Python)" 
                          required
                          value={skill.name} 
                          onChange={e => {
                            const newSkills = [...onboardingForm.skills];
                            newSkills[index].name = e.target.value;
                            setOnboardingForm({ ...onboardingForm, skills: newSkills });
                          }}
                          onFocus={() => setFocusedSkillIndex(index)}
                          onBlur={() => setTimeout(() => setFocusedSkillIndex(null), 200)}
                          style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', color: 'var(--color-text)', border: '1px solid var(--glass-border-light)', borderRadius: '12px', outline: 'none' }} 
                        />
                        {focusedSkillIndex === index && (
                          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 9999, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}>
                            {availableSkills
                              .filter(s => (s.canonicalName || s.name || '').toLowerCase().includes((skill.name || '').toLowerCase()))
                              .map(s => (
                                <div 
                                  key={s._id} 
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    const newSkills = [...onboardingForm.skills];
                                    newSkills[index].name = s.canonicalName || s.name;
                                    setOnboardingForm({ ...onboardingForm, skills: newSkills });
                                    setFocusedSkillIndex(null);
                                  }}
                                  style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '13px', color: '#f8fafc', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.2)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  {s.canonicalName || s.name}
                                </div>
                              ))}
                            {availableSkills.filter(s => (s.canonicalName || s.name || '').toLowerCase().includes((skill.name || '').toLowerCase())).length === 0 && (
                              <div style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>No matches</div>
                            )}
                          </div>
                        )}
                      </div>
                      <select 
                        value={skill.proficiency} 
                        required
                        onChange={e => {
                          const newSkills = [...onboardingForm.skills];
                          newSkills[index].proficiency = e.target.value;
                          setOnboardingForm({ ...onboardingForm, skills: newSkills });
                        }} 
                        style={{ flex: 1.5, padding: '10px', background: 'rgba(255,255,255,0.03)', color: 'var(--color-text)', border: '1px solid var(--glass-border-light)', borderRadius: '12px', outline: 'none' }}
                      >
                        <option value="Beginner" style={{ color: '#ffffff', background: '#1e293b' }}>Beginner</option>
                        <option value="Intermediate" style={{ color: '#ffffff', background: '#1e293b' }}>Intermediate</option>
                        <option value="Advanced" style={{ color: '#ffffff', background: '#1e293b' }}>Advanced</option>
                        <option value="Expert" style={{ color: '#ffffff', background: '#1e293b' }}>Expert</option>
                      </select>
                      <input 
                        type="number" 
                        placeholder="Years" 
                        min="0"
                        required
                        value={skill.yearsOfExperience} 
                        onChange={e => {
                          const newSkills = [...onboardingForm.skills];
                          newSkills[index].yearsOfExperience = Number(e.target.value);
                          setOnboardingForm({ ...onboardingForm, skills: newSkills });
                        }} 
                        style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.03)', color: 'var(--color-text)', border: '1px solid var(--glass-border-light)', borderRadius: '12px', outline: 'none' }} 
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          const newSkills = [...onboardingForm.skills];
                          newSkills.splice(index, 1);
                          setOnboardingForm({ ...onboardingForm, skills: newSkills });
                        }} 
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex' }}
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    className="btn btn-glass" 
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                    onClick={() => setOnboardingForm({ ...onboardingForm, skills: [...onboardingForm.skills, { name: '', proficiency: 'Intermediate', yearsOfExperience: 1 }] })}
                  >
                    + Add Skill
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowOnboardingModal(false)} className="btn btn-glass" style={{ padding: '10px 20px' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ padding: '10px 24px' }}>{isSubmitting ? 'Submitting...' : 'Onboard Employee'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showOffboardingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '450px', padding: '32px' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 800 }}>Offboard Employee</h3>
            <form onSubmit={handleOffboardingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Select Employee *</label>
                <select required value={offboardingForm.employeeId} onChange={e => setOffboardingForm({...offboardingForm, employeeId: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', color: 'var(--color-text)', border: '1px solid var(--glass-border-light)', borderRadius: '12px', outline: 'none' }}>
                  <option value="" disabled>Select an employee</option>
                  {employees.filter(e => e.raw?.status === 'ACTIVE').map(emp => (
                    <option key={emp.raw._id} value={emp.raw._id} style={{ color: '#ffffff', background: '#1e293b' }}>{emp.name} ({emp.id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Reason (Optional)</label>
                <textarea value={offboardingForm.reason} onChange={e => setOffboardingForm({...offboardingForm, reason: e.target.value})} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', color: 'var(--color-text)', border: '1px solid var(--glass-border-light)', borderRadius: '12px', outline: 'none', minHeight: '80px', fontFamily: 'inherit' }} placeholder="Provide a reason for offboarding..." />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowOffboardingModal(false)} className="btn btn-glass" style={{ padding: '10px 20px' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '10px 24px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>{isSubmitting ? 'Processing...' : 'Confirm Offboarding'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProfileModal && (
        <NexusEmployeeProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          employeeId={selectedEmpIdForProfile}
          profileData={fullProfile}
          onProfileUpdated={() => handleViewProfile(selectedEmpIdForProfile)}
          userRole={role}
        />
      )}
      </div>
      {showInviteModal && renderInviteModal()}
    </div>
  );
};

export default EmployeeManagementView;


