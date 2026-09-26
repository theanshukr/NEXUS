import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useToast } from './ToastProvider';

interface Skill {
  name: string;
  proficiency: string;
  yearsOfExperience: number;
}

interface ExtractedSkill {
  mention: string;
  canonicalSkill: string;
  skillId: string;
  confidence: number;
}

export default function OnboardingView({ user }: { user?: any }) {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Step 1 data
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);

  // Master data
  const [designations, setDesignations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [availableSkills, setAvailableSkills] = useState<any[]>([]);

  // Step 2 data
  const [experienceText, setExperienceText] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState(1);
  const [manualSkills, setManualSkills] = useState<string[]>([]);
  const [skillSearch, setSkillSearch] = useState('');
  
  // Step 3 data
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<ExtractedSkill[]>([]);
  const [finalSkills, setFinalSkills] = useState<Skill[]>([]);
  
  // Step 4 data
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    apiClient.get('/designations').then(res => {
      if (res.data?.success) {
        const payload = res.data.data;
        setDesignations(Array.isArray(payload) ? payload : (payload?.data || payload?.docs || []));
      }
    }).catch(e => console.error('Failed to load designations:', e));

    apiClient.get('/departments').then(res => {
      if (res.data?.success) {
        const payload = res.data.data;
        setDepartments(Array.isArray(payload) ? payload : (payload?.data || payload?.docs || []));
      }
    }).catch(e => console.error('Failed to load departments:', e));
    
    apiClient.get('/nexus/skills').then(res => {
      if (res.data?.success) {
        const payload = res.data.data;
        setAvailableSkills(Array.isArray(payload) ? payload : (payload?.data || payload?.docs || []));
      }
    }).catch(e => console.error('Failed to load skills:', e));
  }, []);

  const handleNextToStep2 = () => {
    if (!firstName || !lastName || !employeeCode || !designationId) {
      showToast('Validation Error', 'error', 'Please fill in all required fields.');
      return;
    }
    setStep(2);
  };

  const handleNextToStep3 = async () => {
    // Always proceed if there's manual skills or text, otherwise block
    if (!experienceText.trim() && manualSkills.length === 0) {
      showToast('Validation Error', 'error', 'Please provide resume text or select at least one manual skill.');
      return;
    }
    setStep(3);
    
    const allManual = manualSkills.map(sName => ({
      name: sName,
      proficiency: 'Intermediate',
      yearsOfExperience: yearsOfExperience
    }));

    if (!experienceText.trim()) {
      // If no text, just skip extraction and use manual skills
      setFinalSkills(allManual);
      return;
    }

    setIsExtracting(true);
    try {
      const res = await apiClient.post('/nexus/skills/extract', { text: experienceText });
      if (res.data?.success) {
        setExtractedSkills(res.data.mentions || []);
        
        const allExtracted = (res.data.mentions || []).map((m: any) => ({
          name: m.canonicalSkill || m.mention,
          proficiency: 'Intermediate',
          yearsOfExperience: yearsOfExperience
        }));
        
        const combined = [...allManual, ...allExtracted];
        const unique = Array.from(new Map(combined.map(s => [s.name, s])).values());
        
        setFinalSkills(unique);
      }
    } catch (e: any) {
      showToast('Extraction Error', 'error', e.response?.data?.message || 'Failed to extract skills.');
      setFinalSkills(allManual);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveEmployee = async () => {
    setIsSaving(true);
    try {
      const validSkills = (finalSkills || []).filter(s => s.name && s.name.trim());
      const payload: any = {
        employeeCode: employeeCode.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        designationId,
        joiningDate: joiningDate ? new Date(joiningDate).toISOString() : new Date().toISOString(),
        skills: validSkills
      };
      if (workEmail && workEmail.trim()) {
        payload.workEmail = workEmail.trim();
      }
      if (departmentId && departmentId.trim()) {
        payload.departmentId = departmentId.trim();
      }

      const res = await apiClient.post('/employees', payload);
      if (res.data?.success) {
        showToast('Success', 'success', 'Employee successfully onboarded and added to Skill Graph.');
        setStep(5);
      }
    } catch (e: any) {
      showToast('Save Error', 'error', e.response?.data?.message || 'Failed to create employee.');
      console.error(e.response?.data);
    } finally {
      setIsSaving(false);
    }
  };

  const removeSkill = (index: number) => {
    setFinalSkills(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="page-transition" style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', color: 'var(--color-ui-element)', marginBottom: '8px' }}>Intelligent Workforce Onboarding</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Extract AI skills from resume and seamlessly map the employee to the Enterprise Skill Graph.</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} style={{
            flex: 1, height: '4px', borderRadius: '2px',
            background: step >= s ? '#38bdf8' : 'rgba(255,255,255,0.1)'
          }} />
        ))}
      </div>

      {step === 1 && (
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '24px', color: 'var(--color-ui-element)' }}>Step 1: Basic Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>First Name *</label>
              <input type="text" className="glass-input" style={{ width: '100%', padding: '12px' }} value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Last Name *</label>
              <input type="text" className="glass-input" style={{ width: '100%', padding: '12px' }} value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Employee Code *</label>
              <input type="text" className="glass-input" style={{ width: '100%', padding: '12px' }} value={employeeCode} onChange={e => setEmployeeCode(e.target.value)} placeholder="e.g. EMP-001" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Work Email</label>
              <input type="email" className="glass-input" style={{ width: '100%', padding: '12px' }} value={workEmail} onChange={e => setWorkEmail(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Designation / Role *</label>
              <select className="glass-input" style={{ width: '100%', padding: '12px' }} value={designationId} onChange={e => setDesignationId(e.target.value)}>
                <option value="" style={{ color: '#64748b', background: '#1e293b' }}>Select Role...</option>
                {designations.map(d => <option key={d._id} value={d._id} style={{ color: '#ffffff', background: '#1e293b' }}>{d.title || d.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Department</label>
              <select className="glass-input" style={{ width: '100%', padding: '12px' }} value={departmentId} onChange={e => setDepartmentId(e.target.value)}>
                <option value="" style={{ color: '#64748b', background: '#1e293b' }}>Select Department...</option>
                {departments.map(d => <option key={d._id} value={d._id} style={{ color: '#ffffff', background: '#1e293b' }}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Joining Date</label>
              <input type="date" className="glass-input" style={{ width: '100%', padding: '12px', colorScheme: 'dark' }} value={joiningDate} onChange={e => setJoiningDate(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleNextToStep2} style={{ padding: '12px 24px', fontWeight: 600 }}>Next Step</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '24px', color: 'var(--color-ui-element)' }}>Step 2: Professional Profile & AI Skills</h2>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Manual Skill Selection</label>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
              Select known skills from the existing Enterprise Skill Graph.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <input 
                type="text"
                placeholder="Search skills (e.g. Python, React, PostgreSQL)..."
                className="glass-input"
                style={{ padding: '8px 12px', fontSize: '13px', width: '100%' }}
                value={skillSearch}
                onChange={e => setSkillSearch(e.target.value)}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingTop: '8px' }}>
                {availableSkills
                  .filter(skill => (skill.canonicalName || skill.name || '').toLowerCase().includes((skillSearch || '').toLowerCase()))
                  .map(skill => {
                    const skillName = skill.canonicalName || skill.name;
                    const isSelected = manualSkills.includes(skillName);
                    return (
                      <label key={skill._id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isSelected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '16px', fontSize: '13px', cursor: 'pointer', border: isSelected ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s' }}>
                        <input 
                          type="checkbox" 
                          checked={isSelected} 
                          onChange={(e) => {
                            if (e.target.checked) setManualSkills([...manualSkills, skillName]);
                            else setManualSkills(manualSkills.filter(s => s !== skillName));
                          }} 
                          style={{ display: 'none' }}
                        />
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: isSelected ? '#38bdf8' : 'var(--color-text-secondary)' }}>
                          {isSelected ? 'check_circle' : 'add_circle'}
                        </span>
                        <span style={{ color: isSelected ? 'var(--color-ui-element)' : 'var(--color-text-secondary)' }}>
                          {skillName}
                        </span>
                      </label>
                    );
                  })}
                {availableSkills.filter(skill => (skill.canonicalName || skill.name || '').toLowerCase().includes((skillSearch || '').toLowerCase())).length === 0 && (
                  <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>No matching skills found.</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Years of Experience</label>
            <input type="number" min="0" className="glass-input" style={{ width: '200px', padding: '12px' }} value={yearsOfExperience} onChange={e => setYearsOfExperience(Number(e.target.value))} />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Resume / Work Experience Description (Optional)</label>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
              Paste the employee's project history, resume, or background. Our GLiNER AI pipeline will extract and normalize technology skills to build the Skill Graph profile.
            </p>
            <textarea 
              className="glass-input" 
              style={{ width: '100%', padding: '16px', minHeight: '200px', lineHeight: '1.5', resize: 'vertical' }}
              value={experienceText}
              onChange={e => setExperienceText(e.target.value)}
              placeholder="e.g. Led backend migration using Node.js, Express, and MongoDB. Familiar with Python, Docker, and AWS."
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-glass" onClick={() => setStep(1)} style={{ padding: '12px 24px' }}>Back</button>
            <button className="btn btn-primary" onClick={handleNextToStep3} style={{ padding: '12px 24px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>auto_awesome</span>
              Extract Skills
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '24px', color: 'var(--color-ui-element)' }}>Step 3: Review Extracted Skills</h2>
          
          {isExtracting ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', animation: 'spin 1s linear infinite', marginBottom: '16px' }}>refresh</span>
              <div>AI is analyzing text and mapping to ESCO taxonomies...</div>
            </div>
          ) : (
            <>
              {finalSkills.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', marginBottom: '24px' }}>
                  No skills were detected by the AI. You can go back and provide more detailed text.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '16px', padding: '0 16px', fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <span>Skill (Normalized)</span>
                    <span>Proficiency</span>
                    <span>Years Exp</span>
                    <span></span>
                  </div>
                  {finalSkills.map((skill, idx) => (
                    <div key={idx} className="glass-cutout" style={{ padding: '16px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '16px', alignItems: 'center' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-ui-element)' }}>{skill.name}</div>
                      <select 
                        className="glass-input" 
                        style={{ padding: '8px', fontSize: '13px' }}
                        value={skill.proficiency}
                        onChange={e => {
                          const updated = [...finalSkills];
                          updated[idx].proficiency = e.target.value;
                          setFinalSkills(updated);
                        }}
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Expert">Expert</option>
                      </select>
                      <input 
                        type="number" 
                        className="glass-input" 
                        style={{ padding: '8px', fontSize: '13px' }}
                        value={skill.yearsOfExperience}
                        onChange={e => {
                          const updated = [...finalSkills];
                          updated[idx].yearsOfExperience = Number(e.target.value);
                          setFinalSkills(updated);
                        }}
                      />
                      <button onClick={() => removeSkill(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: 0 }}>
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-glass" onClick={() => setStep(2)} style={{ padding: '12px 24px' }}>Back</button>
                <button className="btn btn-primary" onClick={() => setStep(4)} style={{ padding: '12px 24px', fontWeight: 600 }}>Review & Submit</button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '24px', color: 'var(--color-ui-element)' }}>Step 4: Final Review</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
            <div>
              <h3 style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Employee Details</h3>
              <div className="glass-cutout" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>Name</span> <span style={{ fontWeight: 500 }}>{firstName} {lastName}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>ID</span> <span style={{ fontWeight: 500 }}>{employeeCode}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>Email</span> <span style={{ fontWeight: 500 }}>{workEmail || 'N/A'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--color-text-secondary)' }}>Role</span> <span style={{ fontWeight: 500 }}>{designations.find(d => d._id === designationId)?.title || designationId}</span></div>
              </div>
            </div>
            
            <div>
              <h3 style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Skills Graph Data ({finalSkills.length})</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {finalSkills.map((s, i) => (
                  <span key={i} style={{ padding: '6px 12px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '20px', fontSize: '13px', color: '#38bdf8' }}>
                    {s.name} ({s.proficiency})
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-glass" onClick={() => setStep(3)} style={{ padding: '12px 24px' }}>Back</button>
            <button className="btn btn-primary" onClick={handleSaveEmployee} disabled={isSaving} style={{ padding: '12px 24px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isSaving ? <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>refresh</span> : <span className="material-symbols-outlined">save</span>}
              Confirm & Onboard
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ 
            width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto',
            border: '2px solid rgba(16, 185, 129, 0.3)'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#10b981' }}>check_circle</span>
          </div>
          
          <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--color-ui-element)' }}>Employee Successfully Onboarded</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px auto', lineHeight: '1.5' }}>
            {firstName} {lastName} has been added to the platform. Their extracted skills have been normalized and injected into the Enterprise Skill Graph.
          </p>
          
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => {
              const currentRole = user?.roles?.[0] || 'Standard Employee';
              const roleSlugMap: Record<string, string> = {
                'Standard Employee': 'employee',
                'HR Manager': 'hr',
                'Administrator': 'admin',
                'Finance Executive': 'finance',
                'Super Admin': 'superadmin'
              };
              navigate(`/skill-graph/${roleSlugMap[currentRole] || 'employee'}`);
            }} style={{ padding: '12px 24px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined">hub</span>
              View in Skill Graph
            </button>
            <button className="btn btn-glass" onClick={() => {
              setFirstName(''); setLastName(''); setEmployeeCode(''); setWorkEmail('');
              setExperienceText(''); setExtractedSkills([]); setFinalSkills([]);
              setStep(1);
            }} style={{ padding: '12px 24px', fontWeight: 600 }}>
              Onboard Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
