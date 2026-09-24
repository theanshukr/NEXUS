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

  const { employee, intelligence } = profileData;
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

  const getProficiencyColor = (level: string) => {
    switch (level) {
      case 'Beginner': return '#38bdf8';
      case 'Intermediate': return '#818cf8';
      case 'Advanced': return '#10b981';
      case 'Expert': return '#f59e0b';
      default: return '#38bdf8';
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
      position: 'fixed', inset: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
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
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255, 255, 255, 0.15)'
      }}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '24px', right: '24px',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '50%', width: '36px', height: '36px',
            color: 'var(--color-ui-element)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 20, transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
        </button>

        {/* ─── Profile Header & Persona ─── */}
        <div style={{
          padding: '36px 36px 28px 36px',
          background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%)',
          borderBottom: '1px solid var(--glass-border-light)'
        }}>
          <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start' }}>
            
            {/* Avatar */}
            <div style={{
              width: '90px', height: '90px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '32px', color: '#fff', fontWeight: 800,
              boxShadow: '0 8px 32px rgba(56,189,248,0.4)',
              flexShrink: 0
            }}>
              {employee.firstName?.[0]}{employee.lastName?.[0]}
            </div>

            {/* Profile Overview */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px' }}>
                  {employee.firstName} {employee.lastName}
                </h2>
                <span style={{
                  padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                  background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  fontFamily: '"Fira Code", monospace'
                }}>
                  {employee.employeeCode}
                </span>
                <span style={{
                  padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                  background: employee.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: employee.status === 'ACTIVE' ? '#10b981' : '#f59e0b',
                  border: `1px solid ${employee.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                }}>
                  {employee.status}
                </span>
              </div>

              <div style={{ fontSize: '15px', color: 'var(--color-ui-element)', fontWeight: 600, marginBottom: '8px' }}>
                {intelligence?.headline || `${employee.designation} • ${employee.department}`}
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#38bdf8' }}>location_on</span>
                  {intelligence?.currentLocation || employee.location}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#818cf8' }}>mail</span>
                  {employee.workEmail || 'N/A'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#10b981' }}>history</span>
                  {intelligence?.totalExperienceYears || 5} Yrs Experience
                </span>
              </div>
            </div>
          </div>

          {/* Quick Capability Metrics Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '24px' }}>
            <div className="glass-cutout" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>psychology</span>
              </div>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)', fontWeight: 700 }}>Total Skills</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{intelligence?.metrics?.totalSkillsCount || 0}</div>
              </div>
            </div>

            <div className="glass-cutout" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>verified</span>
              </div>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)', fontWeight: 700 }}>Verified Skills</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>{intelligence?.metrics?.verifiedSkillsCount || 0}</div>
              </div>
            </div>

            <div className="glass-cutout" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>rocket_launch</span>
              </div>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)', fontWeight: 700 }}>Projects</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{intelligence?.metrics?.projectsCount || 0}</div>
              </div>
            </div>

            <div className="glass-cutout" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>workspace_premium</span>
              </div>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)', fontWeight: 700 }}>Certifications</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{intelligence?.metrics?.certificationsCount || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Tabbed Navigation ─── */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--glass-border-light)',
          background: 'rgba(0,0,0,0.06)',
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
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '16px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '3px solid var(--color-ui-element)' : '3px solid transparent',
                color: activeTab === tab.id ? 'var(--color-ui-element)' : 'var(--color-text-secondary)',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                opacity: activeTab === tab.id ? 1 : 0.7
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
              {tab.label}
              {tab.count !== undefined && (
                <span style={{
                  padding: '2px 8px', borderRadius: '12px', fontSize: '11px',
                  background: activeTab === tab.id ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)',
                  fontWeight: 700
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── Tab Content Area ─── */}
        <div style={{ padding: '32px' }}>
          
          {/* TAB 1: Skills & Competencies */}
          {activeTab === 'skills' && (
            <div>
              {/* Category Filter & Actions Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`btn btn-glass ${selectedCategory === cat ? 'active' : ''}`}
                      style={{
                        padding: '6px 14px', borderRadius: '16px', fontSize: '12px', fontWeight: 600,
                        background: selectedCategory === cat ? 'var(--nav-active-bg)' : 'transparent',
                        border: selectedCategory === cat ? '1px solid #38bdf8' : '1px solid var(--glass-border-light)',
                        color: 'var(--color-ui-element)'
                      }}
                    >
                      {cat.replace('_', ' ')}
                    </button>
                  ))}
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
                  <div className="glass-cutout" style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '40px', opacity: 0.5, marginBottom: '8px' }}>psychology_alt</span>
                    <p>No skills recorded in this category yet.</p>
                  </div>
                ) : (
                  filteredSkills.map((s: any) => (
                    <div
                      key={s._id}
                      className="glass-cutout"
                      style={{
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        borderRadius: '16px',
                        border: '1px solid var(--glass-border-light)',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-ui-element)' }}>{s.name}</div>
                          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                            {s.category?.replace('_', ' ')} • {s.yearsOfExperience || 1} Yrs Exp
                          </div>
                        </div>

                        {/* Verification Status Tag */}
                        <span style={{
                          padding: '4px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                          background: s.verificationStatus === 'VERIFIED' ? 'rgba(16, 185, 129, 0.15)' : s.verificationStatus === 'REJECTED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: s.verificationStatus === 'VERIFIED' ? '#10b981' : s.verificationStatus === 'REJECTED' ? '#ef4444' : '#f59e0b',
                          border: `1px solid ${s.verificationStatus === 'VERIFIED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                        }}>
                          {s.verificationStatus}
                        </span>
                      </div>

                      {/* Proficiency Progress Bar */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', fontWeight: 600 }}>
                          <span style={{ color: 'var(--color-text-secondary)' }}>Proficiency</span>
                          <span style={{ color: getProficiencyColor(s.proficiency) }}>{s.proficiency}</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div style={{
                            width: getProficiencyWidth(s.proficiency),
                            height: '100%',
                            borderRadius: '4px',
                            background: getProficiencyColor(s.proficiency),
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>

                      {/* Source & Actions Footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                            {s.source === 'MANAGER_VERIFIED' ? 'verified' : s.source === 'AI_EXTRACTED' ? 'auto_awesome' : 'person'}
                          </span>
                          {s.source?.replace('_', ' ')}
                        </span>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          {isHRorAdmin && s.verificationStatus !== 'VERIFIED' && (
                            <button
                              onClick={() => handleVerifySkill(s._id, 'VERIFIED')}
                              style={{ padding: '4px 8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
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
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Experience History */}
          {activeTab === 'experience' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {(intelligence?.experience || []).length === 0 ? (
                <div className="glass-cutout" style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  <p>No previous work experience recorded.</p>
                </div>
              ) : (
                intelligence.experience.map((exp: any, idx: number) => (
                  <div key={idx} className="glass-cutout" style={{ padding: '24px', borderRadius: '18px', border: '1px solid var(--glass-border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--color-ui-element)' }}>{exp.title}</h4>
                        <div style={{ fontSize: '14px', color: '#38bdf8', fontWeight: 600, marginTop: '2px' }}>
                          {exp.company} • <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>{exp.location}</span>
                        </div>
                      </div>
                      <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, background: 'rgba(255,255,255,0.06)', fontFamily: '"Fira Code", monospace' }}>
                        {exp.startDate} – {exp.endDate || 'Present'}
                      </span>
                    </div>

                    <p style={{ margin: '12px 0 16px 0', fontSize: '14px', lineHeight: '1.6', color: 'var(--color-text-secondary)' }}>
                      {exp.description}
                    </p>

                    {exp.technologies && exp.technologies.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {exp.technologies.map((t: string, ti: number) => (
                          <span key={ti} style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', fontSize: '12px', fontWeight: 600, border: '1px solid rgba(56, 189, 248, 0.2)' }}>
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
                <div className="glass-cutout" style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  <p>No project records found.</p>
                </div>
              ) : (
                intelligence.projects.map((proj: any, idx: number) => (
                  <div key={idx} className="glass-cutout" style={{ padding: '24px', borderRadius: '18px', border: '1px solid var(--glass-border-light)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--color-ui-element)' }}>{proj.name}</h4>
                        {proj.duration && (
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>{proj.duration}</span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#818cf8', marginBottom: '12px' }}>
                        Role: {proj.role}
                      </div>
                      <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--color-text-secondary)', margin: '0 0 16px 0' }}>
                        {proj.description}
                      </p>
                    </div>

                    <div>
                      {proj.impact && (
                        <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '13px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>trending_up</span>
                          {proj.impact}
                        </div>
                      )}

                      {proj.technologies && proj.technologies.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {proj.technologies.map((t: string, ti: number) => (
                            <span key={ti} style={{ padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', fontSize: '11px', fontWeight: 600 }}>
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
                <div className="glass-cutout" style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  <p>No verified certifications found.</p>
                </div>
              ) : (
                intelligence.certifications.map((cert: any, idx: number) => (
                  <div key={idx} className="glass-cutout" style={{ padding: '24px', borderRadius: '18px', border: '1px solid var(--glass-border-light)', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>workspace_premium</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800, color: 'var(--color-ui-element)' }}>{cert.name}</h4>
                      <div style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 600, marginBottom: '8px' }}>{cert.issuer}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {cert.issueDate && <div>Issued: {cert.issueDate}</div>}
                        {cert.credentialId && <div style={{ fontFamily: '"Fira Code", monospace' }}>ID: {cert.credentialId}</div>}
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
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
              <div className="glass-cutout" style={{ padding: '28px', borderRadius: '18px' }}>
                <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '17px', fontWeight: 800, color: '#38bdf8' }}>
                  <span className="material-symbols-outlined">flag</span>
                  Desired Next Roles
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(intelligence?.careerPreferences?.desiredRoles || ['Principal Engineer', 'Technical Architect']).map((role: string, i: number) => (
                    <div key={i} style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', fontWeight: 600, fontSize: '14px' }}>
                      {role}
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-cutout" style={{ padding: '28px', borderRadius: '18px' }}>
                <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '17px', fontWeight: 800, color: '#818cf8' }}>
                  <span className="material-symbols-outlined">school</span>
                  Skills Targeted For Development
                </h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {(intelligence?.careerPreferences?.targetSkills || ['Distributed Consensus', 'Rust', 'LLM Fine-Tuning']).map((skill: string, i: number) => (
                    <span key={i} style={{ padding: '8px 16px', borderRadius: '20px', background: 'rgba(129, 140, 248, 0.12)', border: '1px solid rgba(129, 140, 248, 0.25)', color: '#818cf8', fontWeight: 600, fontSize: '13px' }}>
                      + {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="glass-cutout" style={{ gridColumn: '1 / -1', padding: '28px', borderRadius: '18px' }}>
                <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '17px', fontWeight: 800, color: '#10b981' }}>
                  <span className="material-symbols-outlined">explore</span>
                  Domain Interests & Mobility
                </h4>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {(intelligence?.careerPreferences?.interestDomains || ['High-Frequency FinTech', 'Autonomous AI Agents', 'Platform Engineering']).map((domain: string, i: number) => (
                    <span key={i} style={{ padding: '8px 16px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: 600, fontSize: '13px' }}>
                      {domain}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', display: 'flex', gap: '24px' }}>
                  <span>Preferred Work Mode: <strong>{intelligence?.careerPreferences?.preferredWorkMode || 'HYBRID'}</strong></span>
                  <span>Willing To Relocate: <strong>{intelligence?.careerPreferences?.willingToRelocate ? 'Yes' : 'No'}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Directory HR Details (Existing) */}
          {activeTab === 'hrDetails' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div className="glass-cutout" style={{ padding: '24px', borderRadius: '18px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '1px' }}>Employment Details</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.7 }}>Department</span><span style={{ fontWeight: 600 }}>{employee.department}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.7 }}>Designation</span><span style={{ fontWeight: 600 }}>{employee.designation}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.7 }}>Reporting Manager</span><span style={{ fontWeight: 600 }}>{employee.manager || 'Alex Rivera'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.7 }}>Joining Date</span><span style={{ fontWeight: 600 }}>{employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : 'N/A'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.7 }}>Shift</span><span style={{ fontWeight: 600 }}>{employee.shift}</span></div>
                </div>
              </div>

              <div className="glass-cutout" style={{ padding: '24px', borderRadius: '18px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '1px' }}>Contact & Location</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.7 }}>Work Email</span><span style={{ fontWeight: 600 }}>{employee.workEmail || 'N/A'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.7 }}>Base Location</span><span style={{ fontWeight: 600 }}>{employee.location}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.7 }}>Status</span><span style={{ fontWeight: 600, color: '#10b981' }}>{employee.status}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Add Skill Sub-Modal ─── */}
        {showAddSkillModal && (
          <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 1200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
          }}>
            <div className="glass-panel" style={{ width: '450px', padding: '32px', borderRadius: '20px' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 800 }}>Add Skill to Profile</h3>
              <form onSubmit={handleAddSkillSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Skill Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Apache Kafka, Go, PyTorch"
                    value={newSkill.name}
                    onChange={e => setNewSkill({ ...newSkill, name: e.target.value })}
                    style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'var(--color-text)', border: '1px solid var(--glass-border-light)', borderRadius: '10px', outline: 'none', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Category *</label>
                  <select
                    value={newSkill.category}
                    onChange={e => setNewSkill({ ...newSkill, category: e.target.value })}
                    style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'var(--color-text)', border: '1px solid var(--glass-border-light)', borderRadius: '10px', outline: 'none', fontSize: '14px' }}
                  >
                    {categories.filter(c => c !== 'ALL').map(c => (
                      <option key={c} value={c} style={{ color: '#000' }}>{c.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Proficiency *</label>
                    <select
                      value={newSkill.proficiency}
                      onChange={e => setNewSkill({ ...newSkill, proficiency: e.target.value })}
                      style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'var(--color-text)', border: '1px solid var(--glass-border-light)', borderRadius: '10px', outline: 'none', fontSize: '14px' }}
                    >
                      <option value="Beginner" style={{ color: '#000' }}>Beginner</option>
                      <option value="Intermediate" style={{ color: '#000' }}>Intermediate</option>
                      <option value="Advanced" style={{ color: '#000' }}>Advanced</option>
                      <option value="Expert" style={{ color: '#000' }}>Expert</option>
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
                      style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'var(--color-text)', border: '1px solid var(--glass-border-light)', borderRadius: '10px', outline: 'none', fontSize: '14px' }}
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
