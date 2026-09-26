import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { useToast } from './ToastProvider';

interface NexusEmployeeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  profileData: any;
  onProfileUpdated: () => void;
  userRole?: string;
}

export const NexusEmployeeProfileModal: React.FC<NexusEmployeeProfileModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  profileData,
  onProfileUpdated,
  userRole
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'skills' | 'experience' | 'projects' | 'certifications' | 'career' | 'hrDetails'>('skills');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  
  // New Skill Modal state
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [newSkill, setNewSkill] = useState({
    name: '',
    category: 'BACKEND',
    proficiency: 'Intermediate',
    yearsOfExperience: 2
  });
  const [isSubmittingSkill, setIsSubmittingSkill] = useState(false);

  if (!isOpen || !profileData) return null;

  const { employee = {}, intelligence = {} } = profileData;
  const isHRorAdmin = userRole === 'HR Manager' || userRole === 'Super Admin' || userRole === 'Administrator';

  // Filter skills by category
  const skills = intelligence?.skills || [];
  const filteredSkills = selectedCategory === 'ALL'
    ? skills
    : skills.filter((s: any) => s.category === selectedCategory);

  const categories = ['ALL', 'BACKEND', 'FRONTEND', 'CLOUD_DEVOPS', 'DATA_AI', 'DATABASE', 'ARCHITECTURE', 'QA_TESTING', 'SECURITY', 'MANAGEMENT'];

  const getProficiencyWidth = (level: string) => {
    switch (level) {
      case 'Beginner': return '25%';
      case 'Intermediate': return '50%';
      case 'Advanced': return '75%';
      case 'Expert': return '100%';
      default: return '50%';
    }
  };

  const handleVerifySkill = async (skillId: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      await apiClient.patch(`/nexus/employees/${employeeId}/skills/${skillId}`, {
        verificationStatus: status
      });
      showToast('Success', 'success', `Skill marked as ${status.toLowerCase()}.`);
      onProfileUpdated();
    } catch (err: any) {
      showToast('Error', 'error', err.response?.data?.message || 'Failed to update skill status');
    }
  };

  const handleRemoveSkill = async (skillId: string, skillName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${skillName}?`)) return;
    try {
      await apiClient.delete(`/nexus/employees/${employeeId}/skills/${skillId}`);
      showToast('Removed', 'info', `Skill '${skillName}' removed.`);
      onProfileUpdated();
    } catch (err: any) {
      showToast('Error', 'error', err.response?.data?.message || 'Failed to remove skill');
    }
  };

  const handleAddSkillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.name.trim()) return;
    setIsSubmittingSkill(true);
    try {
      await apiClient.post(`/nexus/employees/${employeeId}/skills`, newSkill);
      showToast('Skill Added', 'success', `Skill '${newSkill.name}' added to profile.`);
      setShowAddSkillModal(false);
      setNewSkill({ name: '', category: 'BACKEND', proficiency: 'Intermediate', yearsOfExperience: 2 });
      onProfileUpdated();
    } catch (err: any) {
      showToast('Error', 'error', err.response?.data?.message || 'Failed to add skill');
    } finally {
      setIsSubmittingSkill(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      zIndex: 1100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      animation: 'fadeIn 0.25s ease-out'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '1050px',
        maxHeight: '92vh',
        overflowY: 'auto',
        position: 'relative',
        padding: '0',
        borderRadius: '24px',
        boxShadow: '0 30px 60px -15px var(--glass-shadow)',
        border: '1px solid var(--cutout-border)'
      }}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            background: 'var(--cutout-bg)',
            border: '1px solid var(--cutout-border)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 20,
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--nav-active-bg)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--cutout-bg)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
        </button>

        {/* ─── Profile Header & Persona ─── */}
        <div style={{
          padding: '36px 36px 28px 36px',
          background: 'var(--cutout-bg)',
          borderBottom: '1px solid var(--cutout-border)'
        }}>
          <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start' }}>
            
            {/* Avatar */}
            <div style={{
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              background: 'var(--nav-active-bg)',
              border: '2px solid var(--cutout-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '30px',
              color: 'var(--color-primary)',
              fontWeight: 800,
              boxShadow: '0 4px 16px var(--glass-shadow)',
              flexShrink: 0,
              letterSpacing: '-0.5px'
            }}>
              {employee.firstName?.[0] || 'E'}{employee.lastName?.[0] || 'M'}
            </div>

            {/* Profile Overview */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--color-primary)' }}>
                  {employee.firstName} {employee.lastName}
                </h2>
                {employee.employeeCode && (
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: 'var(--nav-active-bg)',
                    color: 'var(--color-ui-element)',
                    border: '1px solid var(--cutout-border)',
                    fontFamily: '"Fira Code", monospace'
                  }}>
                    {employee.employeeCode}
                  </span>
                )}
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  background: employee.status === 'ACTIVE' || employee.status === 'Active' ? 'rgba(16, 185, 129, 0.12)' : 'var(--nav-active-bg)',
                  color: employee.status === 'ACTIVE' || employee.status === 'Active' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  border: employee.status === 'ACTIVE' || employee.status === 'Active' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--cutout-border)'
                }}>
                  {employee.status || 'Active'}
                </span>
              </div>

              <div style={{ fontSize: '15px', color: 'var(--color-ui-element)', fontWeight: 600, marginBottom: '10px' }}>
                {intelligence?.headline || `${employee.designation || 'Specialist'} • ${employee.department || 'Workforce'}`}
              </div>

              <div style={{ display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                {(intelligence?.currentLocation || employee.location) && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-text-secondary)' }}>location_on</span>
                    {intelligence?.currentLocation || employee.location}
                  </span>
                )}
                {employee.workEmail && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-text-secondary)' }}>mail</span>
                    {employee.workEmail}
                  </span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-text-secondary)' }}>history</span>
                  {intelligence?.totalExperienceYears || 5} Yrs Experience
                </span>
              </div>
            </div>
          </div>

          {/* Quick Capability Metrics Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '24px' }}>
            <div className="glass-cutout" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--cutout-border)' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--nav-active-bg)', color: 'var(--color-ui-element)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--cutout-border)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>psychology</span>
              </div>
              <div>
                <div className="text-metadata">Total Skills</div>
                <div style={{ fontSize: '19px', fontWeight: 800, color: 'var(--color-primary)' }}>{intelligence?.metrics?.totalSkillsCount || skills.length || 0}</div>
              </div>
            </div>

            <div className="glass-cutout" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--cutout-border)' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>verified</span>
              </div>
              <div>
                <div className="text-metadata">Verified Skills</div>
                <div style={{ fontSize: '19px', fontWeight: 800, color: 'var(--color-accent)' }}>{intelligence?.metrics?.verifiedSkillsCount || skills.filter((s: any) => s.verificationStatus === 'VERIFIED').length || 0}</div>
              </div>
            </div>

            <div className="glass-cutout" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--cutout-border)' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--nav-active-bg)', color: 'var(--color-ui-element)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--cutout-border)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>rocket_launch</span>
              </div>
              <div>
                <div className="text-metadata">Projects</div>
                <div style={{ fontSize: '19px', fontWeight: 800, color: 'var(--color-primary)' }}>{intelligence?.metrics?.projectsCount || (intelligence?.projects || []).length || 0}</div>
              </div>
            </div>

            <div className="glass-cutout" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--cutout-border)' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--nav-active-bg)', color: 'var(--color-ui-element)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--cutout-border)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>workspace_premium</span>
              </div>
              <div>
                <div className="text-metadata">Certifications</div>
                <div style={{ fontSize: '19px', fontWeight: 800, color: 'var(--color-primary)' }}>{intelligence?.metrics?.certificationsCount || (intelligence?.certifications || []).length || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Tabbed Navigation ─── */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--cutout-border)',
          background: 'var(--cutout-bg)',
          padding: '0 24px',
          overflowX: 'auto'
        }}>
          {[
            { id: 'skills', label: 'Skills & Competencies', icon: 'auto_awesome', count: skills.length },
            { id: 'experience', label: 'Experience History', icon: 'business_center', count: (intelligence?.experience || []).length },
            { id: 'projects', label: 'Key Projects', icon: 'assignment', count: (intelligence?.projects || []).length },
            { id: 'certifications', label: 'Certifications', icon: 'verified_user', count: (intelligence?.certifications || []).length },
            { id: 'career', label: 'Career & Growth', icon: 'trending_up' },
            { id: 'hrDetails', label: 'HR Record', icon: 'badge' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '16px 20px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontSize: '14px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  opacity: isActive ? 1 : 0.75
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
                {tab.label}
                {tab.count !== undefined && (
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    background: isActive ? 'var(--nav-active-bg)' : 'var(--cutout-bg)',
                    border: '1px solid var(--cutout-border)',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    fontWeight: 700
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── Tab Content Area ─── */}
        <div style={{ padding: '32px' }}>
          
          {/* TAB 1: Skills & Competencies */}
          {activeTab === 'skills' && (
            <div>
              {/* Category Filter & Actions Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {categories.map(cat => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: isSelected ? 'var(--color-primary)' : 'var(--cutout-bg)',
                          color: isSelected ? 'var(--color-background-base)' : 'var(--color-ui-element)',
                          border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--cutout-border)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {cat.replace('_', ' ')}
                      </button>
                    );
                  })}
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => setShowAddSkillModal(true)}
                  style={{ padding: '8px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                  Add Skill
                </button>
              </div>

              {/* Skills Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '16px' }}>
                {filteredSkills.length === 0 ? (
                  <div className="glass-cutout" style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: 'var(--color-text-secondary)', border: '1px solid var(--cutout-border)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '40px', opacity: 0.5, marginBottom: '8px' }}>psychology_alt</span>
                    <p>No skills recorded in this category yet.</p>
                  </div>
                ) : (
                  filteredSkills.map((s: any) => {
                    const isVerified = s.verificationStatus === 'VERIFIED';
                    const isRejected = s.verificationStatus === 'REJECTED';

                    return (
                      <div
                        key={s._id || s.name}
                        className="glass-cutout"
                        style={{
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          borderRadius: '16px',
                          border: '1px solid var(--cutout-border)',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>{s.name}</div>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: '2px' }}>
                              {s.category?.replace('_', ' ')} • {s.yearsOfExperience || 1} Yrs Exp
                            </div>
                          </div>

                          {/* Verification Status Tag */}
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            background: isVerified ? 'rgba(16, 185, 129, 0.12)' : isRejected ? 'rgba(239, 68, 68, 0.12)' : 'var(--nav-active-bg)',
                            color: isVerified ? 'var(--color-accent)' : isRejected ? '#ef4444' : 'var(--color-text-secondary)',
                            border: isVerified ? '1px solid rgba(16, 185, 129, 0.3)' : isRejected ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--cutout-border)'
                          }}>
                            {s.verificationStatus || 'PENDING'}
                          </span>
                        </div>

                        {/* Proficiency Progress Bar */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', fontWeight: 600 }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>Proficiency</span>
                            <span style={{ color: 'var(--color-primary)' }}>{s.proficiency}</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', borderRadius: '4px', background: 'var(--nav-active-bg)', overflow: 'hidden' }}>
                            <div style={{
                              width: getProficiencyWidth(s.proficiency),
                              height: '100%',
                              borderRadius: '4px',
                              background: 'var(--color-accent)',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        </div>

                        {/* Source & Actions Footer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--cutout-border)' }}>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                              {s.source === 'MANAGER_VERIFIED' ? 'verified' : s.source === 'AI_EXTRACTED' ? 'auto_awesome' : 'person'}
                            </span>
                            {s.source?.replace('_', ' ') || 'Direct Input'}
                          </span>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            {isHRorAdmin && !isVerified && (
                              <button
                                onClick={() => handleVerifySkill(s._id, 'VERIFIED')}
                                style={{ padding: '4px 8px', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--color-accent)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                title="Verify Skill"
                              >
                                Verify
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveSkill(s._id, s.name)}
                              style={{ padding: '4px 8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                              title="Remove Skill"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Experience History */}
          {activeTab === 'experience' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {(intelligence?.experience || []).length === 0 ? (
                <div className="glass-cutout" style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-secondary)', border: '1px solid var(--cutout-border)' }}>
                  <p>No previous work experience recorded.</p>
                </div>
              ) : (
                intelligence.experience.map((exp: any, idx: number) => (
                  <div key={idx} className="glass-cutout" style={{ padding: '24px', borderRadius: '18px', border: '1px solid var(--cutout-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)' }}>{exp.title}</h4>
                        <div style={{ fontSize: '14px', color: 'var(--color-ui-element)', fontWeight: 600, marginTop: '2px' }}>
                          {exp.company} {exp.location ? <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>• {exp.location}</span> : null}
                        </div>
                      </div>
                      <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, background: 'var(--nav-active-bg)', border: '1px solid var(--cutout-border)', color: 'var(--color-text-secondary)', fontFamily: '"Fira Code", monospace' }}>
                        {exp.startDate} – {exp.endDate || 'Present'}
                      </span>
                    </div>

                    <p style={{ margin: '12px 0 16px 0', fontSize: '14px', lineHeight: '1.6', color: 'var(--color-text-secondary)' }}>
                      {exp.description}
                    </p>

                    {exp.technologies && exp.technologies.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {exp.technologies.map((t: string, ti: number) => (
                          <span key={ti} style={{ padding: '4px 10px', borderRadius: '8px', background: 'var(--nav-active-bg)', color: 'var(--color-ui-element)', fontSize: '12px', fontWeight: 600, border: '1px solid var(--cutout-border)' }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: Key Projects */}
          {activeTab === 'projects' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
              {(intelligence?.projects || []).length === 0 ? (
                <div className="glass-cutout" style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: 'var(--color-text-secondary)', border: '1px solid var(--cutout-border)' }}>
                  <p>No project records found.</p>
                </div>
              ) : (
                intelligence.projects.map((proj: any, idx: number) => (
                  <div key={idx} className="glass-cutout" style={{ padding: '24px', borderRadius: '18px', border: '1px solid var(--cutout-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)' }}>{proj.name}</h4>
                        {proj.duration && (
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>{proj.duration}</span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ui-element)', marginBottom: '12px' }}>
                        Role: {proj.role}
                      </div>
                      <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--color-text-secondary)', margin: '0 0 16px 0' }}>
                        {proj.description}
                      </p>
                    </div>

                    <div>
                      {proj.impact && (
                        <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--color-accent)', fontSize: '13px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>trending_up</span>
                          {proj.impact}
                        </div>
                      )}

                      {proj.technologies && proj.technologies.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {proj.technologies.map((t: string, ti: number) => (
                            <span key={ti} style={{ padding: '4px 8px', borderRadius: '6px', background: 'var(--nav-active-bg)', border: '1px solid var(--cutout-border)', fontSize: '11px', fontWeight: 600, color: 'var(--color-ui-element)' }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: Certifications */}
          {activeTab === 'certifications' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
              {(intelligence?.certifications || []).length === 0 ? (
                <div className="glass-cutout" style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: 'var(--color-text-secondary)', border: '1px solid var(--cutout-border)' }}>
                  <p>No verified certifications found.</p>
                </div>
              ) : (
                intelligence.certifications.map((cert: any, idx: number) => (
                  <div key={idx} className="glass-cutout" style={{ padding: '24px', borderRadius: '18px', border: '1px solid var(--cutout-border)', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--nav-active-bg)', color: 'var(--color-ui-element)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--cutout-border)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>workspace_premium</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)' }}>{cert.name}</h4>
                      <div style={{ fontSize: '13px', color: 'var(--color-ui-element)', fontWeight: 600, marginBottom: '8px' }}>{cert.issuer}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {cert.issueDate && <div>Issued: {cert.issueDate}</div>}
                        {cert.credentialId && <div style={{ fontFamily: '"Fira Code", monospace' }}>ID: {cert.credentialId}</div>}
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, background: 'rgba(16, 185, 129, 0.12)', color: 'var(--color-accent)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          ✓ {cert.verificationStatus || 'VERIFIED'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5: Career & Growth Preferences */}
          {activeTab === 'career' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div className="glass-cutout" style={{ padding: '28px', borderRadius: '18px', border: '1px solid var(--cutout-border)' }}>
                <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-ui-element)' }}>flag</span>
                  Desired Next Roles
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(intelligence?.careerPreferences?.desiredRoles || ['Principal Engineer', 'Technical Architect']).map((role: string, i: number) => (
                    <div key={i} style={{ padding: '12px 16px', borderRadius: '12px', background: 'var(--nav-active-bg)', border: '1px solid var(--cutout-border)', fontWeight: 600, fontSize: '14px', color: 'var(--color-primary)' }}>
                      {role}
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-cutout" style={{ padding: '28px', borderRadius: '18px', border: '1px solid var(--cutout-border)' }}>
                <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-ui-element)' }}>school</span>
                  Skills Targeted For Development
                </h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {(intelligence?.careerPreferences?.targetSkills || ['Distributed Consensus', 'Rust', 'LLM Fine-Tuning']).map((skill: string, i: number) => (
                    <span key={i} style={{ padding: '8px 16px', borderRadius: '20px', background: 'var(--nav-active-bg)', border: '1px solid var(--cutout-border)', color: 'var(--color-primary)', fontWeight: 600, fontSize: '13px' }}>
                      + {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="glass-cutout" style={{ gridColumn: '1 / -1', padding: '28px', borderRadius: '18px', border: '1px solid var(--cutout-border)' }}>
                <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-ui-element)' }}>explore</span>
                  Domain Interests & Mobility
                </h4>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {(intelligence?.careerPreferences?.interestDomains || ['High-Frequency FinTech', 'Autonomous AI Agents', 'Platform Engineering']).map((domain: string, i: number) => (
                    <span key={i} style={{ padding: '8px 16px', borderRadius: '12px', background: 'var(--nav-active-bg)', border: '1px solid var(--cutout-border)', color: 'var(--color-primary)', fontWeight: 600, fontSize: '13px' }}>
                      {domain}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', display: 'flex', gap: '24px' }}>
                  <span>Preferred Work Mode: <strong style={{ color: 'var(--color-primary)' }}>{intelligence?.careerPreferences?.preferredWorkMode || 'HYBRID'}</strong></span>
                  <span>Willing To Relocate: <strong style={{ color: 'var(--color-primary)' }}>{intelligence?.careerPreferences?.willingToRelocate ? 'Yes' : 'No'}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Directory HR Details */}
          {activeTab === 'hrDetails' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div className="glass-cutout" style={{ padding: '24px', borderRadius: '18px', border: '1px solid var(--cutout-border)' }}>
                <h4 className="text-metadata" style={{ marginBottom: '16px' }}>Employment Details</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Department</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{employee.department || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Designation</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{employee.designation || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Reporting Manager</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{employee.manager || 'Alex Rivera'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Joining Date</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Shift</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{employee.shift || 'Standard (Day)'}</span>
                  </div>
                </div>
              </div>

              <div className="glass-cutout" style={{ padding: '24px', borderRadius: '18px', border: '1px solid var(--cutout-border)' }}>
                <h4 className="text-metadata" style={{ marginBottom: '16px' }}>Contact & Location</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Work Email</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{employee.workEmail || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Base Location</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{employee.location || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Status</span>
                    <span style={{ fontWeight: 600, color: employee.status === 'ACTIVE' || employee.status === 'Active' ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>{employee.status || 'Active'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Add Skill Sub-Modal ─── */}
        {showAddSkillModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <div className="glass-panel" style={{ width: '450px', padding: '32px', borderRadius: '20px', border: '1px solid var(--cutout-border)' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 800, color: 'var(--color-primary)' }}>Add Skill to Profile</h3>
              <form onSubmit={handleAddSkillSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Skill Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Apache Kafka, Go, PyTorch"
                    value={newSkill.name}
                    onChange={e => setNewSkill({ ...newSkill, name: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Category *</label>
                  <select
                    value={newSkill.category}
                    onChange={e => setNewSkill({ ...newSkill, category: e.target.value })}
                    className="form-input"
                  >
                    {categories.filter(c => c !== 'ALL').map(c => (
                      <option key={c} value={c}>{c.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Proficiency *</label>
                    <select
                      value={newSkill.proficiency}
                      onChange={e => setNewSkill({ ...newSkill, proficiency: e.target.value })}
                      className="form-input"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Years Exp *</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={newSkill.yearsOfExperience}
                      onChange={e => setNewSkill({ ...newSkill, yearsOfExperience: Number(e.target.value) })}
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button type="button" onClick={() => setShowAddSkillModal(false)} className="btn btn-glass" style={{ padding: '10px 18px' }}>Cancel</button>
                  <button type="submit" disabled={isSubmittingSkill} className="btn btn-primary" style={{ padding: '10px 24px' }}>
                    {isSubmittingSkill ? 'Saving...' : 'Add Skill'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NexusEmployeeProfileModal;
