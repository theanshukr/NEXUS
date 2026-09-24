import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useToast } from './ToastProvider';

export default function RecruitmentPipelineView({ role, user }: { role: string, user?: any }) {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isCreatingReq, setIsCreatingReq] = useState(false);
  const [editReqId, setEditReqId] = useState<string | null>(null);
  const [newReq, setNewReq] = useState({ title: '', deptId: '', location: '' });

  const fetchRecruitmentData = async () => {
    try {
      const [reqRes, appRes, deptRes] = await Promise.all([
        apiClient.get('/requisitions').catch(() => null),
        apiClient.get('/applications').catch(() => null),
        apiClient.get('/departments/options').catch((e) => { console.error(e); return null; })
      ]);

      if (deptRes?.data) {
        let depts = deptRes.data.data || deptRes.data;
        if (depts && typeof depts === 'object' && !Array.isArray(depts)) {
          depts = depts.data || depts.items || depts.departments || [];
        }
        setDepartments(Array.isArray(depts) ? depts : []);
      }

      if (reqRes?.data?.data) {
        const reqItems = reqRes.data.data.data || reqRes.data.data.items || reqRes.data.data;
        if (Array.isArray(reqItems)) {
          const mappedJobs = reqItems.map((r: any) => ({
            id: r._id,
            title: r.title || r.designationId?.name || 'Open Position',
            dept: r.departmentId?.name || 'Department',
            location: r.locationId?.name || 'Remote',
            type: r.employmentType || 'Full-time',
            posted: new Date(r.createdAt).toLocaleDateString(),
            referralBonus: null,
            salaryRange: r.salary ? `$${r.salary.min/1000}k - $${r.salary.max/1000}k` : 'Competitive',
            rawSalary: r.salary?.max || 150000
          }));
          setJobs(mappedJobs);
        }
      }

      if (appRes?.data?.data) {
        const appItems = appRes.data.data.data || appRes.data.data.items || appRes.data.data;
        if (Array.isArray(appItems)) {
          const mappedCands = appItems.map((a: any) => {
            let stageName = 'Sourced';
            if (a.workflowInstanceId && a.workflowInstanceId.workflowSnapshot) {
               const currentStage = a.workflowInstanceId.workflowSnapshot.find((s:any) => s._id.toString() === a.workflowInstanceId.currentStageId);
               if (currentStage) stageName = currentStage.name;
            }
            return {
              id: a._id,
              name: `${a.candidateId?.firstName || 'Unknown'} ${a.candidateId?.lastName || ''}`,
              role: a.jobPostingId?.title || 'Applicant',
              stage: stageName,
              status: a.status || 'In Progress',
              expectedSalary: a.expectedSalary ? `$${a.expectedSalary/1000}k` : 'TBD',
              feedbackScore: 'Pending',
              nextInterview: 'TBD'
            };
          });
          setCandidates(mappedCands);
        }
      }
    } catch (err) {
      console.error('Failed to fetch recruitment data', err);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchRecruitmentData();
  }, []);

  const handleDragStart = (e: React.DragEvent, candidateId: string) => {
    e.dataTransfer.setData('candidateId', candidateId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    const candidateId = e.dataTransfer.getData('candidateId');
    if (!candidateId) return;

    try {
      await apiClient.patch(`/applications/${candidateId}/advance`);
      fetchRecruitmentData();
    } catch (error) {
      console.error('Failed to advance stage', error);
      alert('Could not advance candidate. Backend strictly enforces advancing to the next sequential stage.');
    }
  };

  const handleDeleteReq = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this requisition?')) return;
    try {
      await apiClient.delete(`/requisitions/${id}`);
      fetchRecruitmentData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete requisition');
    }
  };

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReq.deptId) {
      alert('Please select a department');
      return;
    }
    try {
      if (editReqId) {
        await apiClient.put(`/requisitions/${editReqId}`, {
          title: newReq.title,
          departmentId: newReq.deptId,
          location: newReq.location
        });
      } else {
        await apiClient.post('/requisitions', {
          title: newReq.title,
          departmentId: newReq.deptId,
          location: newReq.location,
          employmentType: 'FULL_TIME',
          workMode: 'REMOTE',
          jobCode: `REQ-${Math.floor(Math.random() * 1000)}`,
          reportingManagerId: user?._id || '6a4ba7e8a84593718d8a32ff',
          description: 'New position auto-generated from Kanban board',
          minimumExperienceYears: 2,
          maximumExperienceYears: 5,
          openPositions: 1,
          salary: { min: 80000, max: 120000, currency: 'USD', period: 'YEARLY' }
        });
      }
      setIsCreatingReq(false);
      setEditReqId(null);
      setNewReq({ title: '', deptId: '', location: '' });
      fetchRecruitmentData();
    } catch (error) {
      console.error('Failed to create/edit requisition', error);
      alert('Failed to save requisition. See console for details.');
    }
  };

  // View: Standard Employee (Internal Job Board)
  if (role === 'Standard Employee') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>Internal Job Board</h2>
          <p className="text-secondary" style={{ fontSize: '14px' }}>Explore new career opportunities within the enterprise.</p>
        </div>

        <div className="grid-12">
          {jobs.length === 0 && (
             <div style={{ gridColumn: 'span 12', padding: '24px', textAlign: 'center', background: 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
                <p className="text-secondary">No active job opportunities found.</p>
             </div>
          )}
          {jobs.map(job => (
            <div key={job.id} className="glass-panel" style={{ gridColumn: 'span 4', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}>
              {job.referralBonus && (
                <div style={{ position: 'absolute', top: '16px', right: '-32px', background: 'var(--color-blob-1)', color: '#fff', fontSize: '11px', fontWeight: 600, padding: '4px 32px', transform: 'rotate(45deg)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                  REFERRAL: {job.referralBonus}
                </div>
              )}
              <div>
                <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: 'var(--cutout-bg)', color: 'var(--color-ui-element)', display: 'inline-block', marginBottom: '12px' }}>
                  {job.dept}
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', paddingRight: '24px' }}>{job.title}</h3>
                <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>location_on</span>{job.location}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>schedule</span>{job.type}</span>
                </div>
              </div>
              
              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary" onClick={async () => {
                  try {
                    await apiClient.post(`/applications/internal/${job.id}/apply`);
                    showToast('Success', 'success', 'Application submitted successfully!');
                  } catch (err) {
                    showToast('Error', 'error', 'Failed to submit application');
                  }
                }} style={{ flex: 1, padding: '8px', fontSize: '13px' }}>Apply Now</button>
                <button className="btn btn-glass" onClick={async () => {
                  try {
                    await apiClient.post(`/applications/internal/${job.id}/refer`);
                    showToast('Success', 'success', 'Referral submitted successfully!');
                  } catch (err) {
                    showToast('Error', 'error', 'Failed to submit referral');
                  }
                }} style={{ flex: 1, padding: '8px', fontSize: '13px' }}>Refer a Friend</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // View: HR Manager / Super Admin (Kanban Board)
  if (role === 'HR Manager' || role === 'Super Admin') {
    const columns = ['Sourced', 'Technical Round', 'HR Round', 'Offer Extended', 'Hired'];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>Recruitment Pipeline</h2>
            <p className="text-secondary" style={{ fontSize: '14px' }}>Active Headcount Tracking & Candidate Management</p>
          </div>
          <button className="btn btn-primary" onClick={() => {
            setEditReqId(null);
            setNewReq({ title: '', deptId: '', location: '' });
            setIsCreatingReq(true);
          }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
            Create Requisition
          </button>
        </div>

        {isCreatingReq && (
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '16px' }}>
             <h3 style={{ marginBottom: '16px' }}>Create Job Requisition</h3>
             <form onSubmit={handleCreateRequisition} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
               <div style={{ flex: 1 }}>
                 <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px' }}>Job Title</label>
                 <input type="text" className="form-input" required value={newReq.title} onChange={e => setNewReq({...newReq, title: e.target.value})} />
               </div>
               <div style={{ flex: 1 }}>
                 <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px' }}>Department</label>
                 <select className="form-input" required value={newReq.deptId} onChange={e => setNewReq({...newReq, deptId: e.target.value})}>
                   <option value="" style={{ color: '#000' }}>Select Department</option>
                   {departments.map(d => (
                     <option key={d.value || d._id} value={d.value || d._id} style={{ color: '#000' }}>{d.label || d.name}</option>
                   ))}
                 </select>
               </div>
               <div style={{ flex: 1 }}>
                 <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px' }}>Location</label>
                 <input type="text" className="form-input" required value={newReq.location} onChange={e => setNewReq({...newReq, location: e.target.value})} />
               </div>
               <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px' }}>{editReqId ? 'Update' : 'Submit'}</button>
               <button type="button" className="btn btn-glass" onClick={() => { setIsCreatingReq(false); setEditReqId(null); }} style={{ padding: '12px 24px' }}>Cancel</button>
             </form>
          </div>
        )}

        {/* Active Requisitions Table */}
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Active Openings</h3>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }}>
             <thead>
               <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                 <th style={{ padding: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Department</th>
                 <th style={{ padding: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Role</th>
                 <th style={{ padding: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Location</th>
                 <th style={{ padding: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Posted</th>
                 <th style={{ padding: '12px', color: 'var(--color-text-secondary)', fontWeight: 500, textAlign: 'right' }}>Actions</th>
               </tr>
             </thead>
             <tbody>
               {jobs.map(job => (
                 <tr key={job.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                   <td style={{ padding: '12px' }}>{job.dept}</td>
                   <td style={{ padding: '12px', fontWeight: 500 }}>{job.title}</td>
                   <td style={{ padding: '12px' }}>{job.location}</td>
                   <td style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>{job.posted}</td>
                   <td style={{ padding: '12px', textAlign: 'right' }}>
                     <button className="btn btn-glass" style={{ padding: '4px 8px', fontSize: '12px', marginRight: '8px' }} onClick={() => {
                        const dept = departments.find(d => (d.label || d.name) === job.dept);
                        setNewReq({ title: job.title, deptId: dept ? (dept.value || dept._id) : '', location: job.location });
                        setEditReqId(job.id);
                        setIsCreatingReq(true);
                     }}>Edit</button>
                     <button className="btn btn-glass" style={{ padding: '4px 8px', fontSize: '12px', color: '#ef4444' }} onClick={() => handleDeleteReq(job.id)}>Delete</button>
                   </td>
                 </tr>
               ))}
               {jobs.length === 0 && (
                 <tr>
                   <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No active requisitions found.</td>
                 </tr>
               )}
             </tbody>
          </table>
        </div>

        {/* Kanban Board Container */}
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', minHeight: '500px' }}>
          {columns.map(col => (
            <div 
              key={col} 
              className="glass-panel" 
              style={{ flex: '0 0 300px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{col}</h3>
                <span style={{ fontSize: '12px', background: 'var(--color-accent)', color: '#fff', padding: '2px 8px', borderRadius: '12px' }}>
                  {candidates.filter(c => c.stage === col).length}
                </span>
              </div>
              
              {/* Kanban Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {candidates.filter(c => c.stage === col).map(candidate => (
                  <div 
                    key={candidate.id} 
                    className="glass-cutout" 
                    draggable
                    onDragStart={(e) => handleDragStart(e, candidate.id)}
                    style={{ padding: '16px', cursor: 'grab' }}
                  >
                    <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{candidate.name}</h4>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>{candidate.role}</p>
                    
                    <div style={{ padding: '8px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px', fontSize: '12px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                         <span className="text-secondary">Expected:</span>
                         <span style={{ fontWeight: 500 }}>{candidate.expectedSalary}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                         <span className="text-secondary">Score:</span>
                         <span style={{ fontWeight: 500, color: 'var(--color-ui-element)' }}>{candidate.feedbackScore}</span>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                         <span className="text-secondary">Next:</span>
                         <span>{candidate.nextInterview}</span>
                       </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>{candidate.status}</span>
                      <button onClick={() => showToast('Feature in Development', 'info', 'This feature is currently in development.')} className="btn btn-glass" style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', border: 'none', background: 'transparent' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit_calendar</span> Schedule
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // View: Finance Executive
  if (role === 'Finance Executive') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>Recruitment Financial Impact</h2>
          <p className="text-secondary" style={{ fontSize: '14px' }}>Budget forecasting based on active headcount pipeline.</p>
        </div>

        <div className="grid-12">
          <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '24px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Projected Payroll Increase</h3>
            <p style={{ fontSize: '36px', fontWeight: 300, letterSpacing: '-1px' }}>
              ${jobs.length > 0 ? (jobs.reduce((acc, job) => acc + (job.rawSalary || 150000), 0) / 1000).toFixed(1) : '0'}k
            </p>
            <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '8px' }}>+5% over Q3 Budget</p>
          </div>
          <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '24px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Total Open Requisitions</h3>
            <p style={{ fontSize: '36px', fontWeight: 300, letterSpacing: '-1px' }}>{jobs.length}</p>
          </div>
          <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '24px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Referral Bonus Liability</h3>
            <p style={{ fontSize: '36px', fontWeight: 300, letterSpacing: '-1px' }}>$0.0k</p>
          </div>
          
          <div className="glass-panel" style={{ gridColumn: 'span 12', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Active Openings Breakdown</h3>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }}>
               <thead>
                 <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                   <th style={{ padding: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Department</th>
                   <th style={{ padding: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Role</th>
                   <th style={{ padding: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Expected Salary Range</th>
                   <th style={{ padding: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Pipeline Status</th>
                 </tr>
               </thead>
               <tbody>
                 {jobs.map(job => (
                   <tr key={job.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                     <td style={{ padding: '12px' }}>{job.dept}</td>
                     <td style={{ padding: '12px', fontWeight: 500 }}>{job.title}</td>
                     <td style={{ padding: '12px' }}>{job.salaryRange}</td>
                     <td style={{ padding: '12px' }}><span style={{ padding: '4px 8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '4px', fontSize: '12px' }}>Sourcing</span></td>
                   </tr>
                 ))}
                 {jobs.length === 0 && (
                   <tr>
                     <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No active requisitions found.</td>
                   </tr>
                 )}
               </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // View: Administrator (Read-Only Summary)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>Recruitment Summary</h2>
        <p className="text-secondary" style={{ fontSize: '14px' }}>Read-only overview of active headcounts and pipeline metrics.</p>
      </div>

      <div className="grid-12">
        <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '24px' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Active Openings</h3>
          <p style={{ fontSize: '36px', fontWeight: 300, letterSpacing: '-1px' }}>{jobs.length}</p>
        </div>
        <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '24px' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Candidates in Pipeline</h3>
          <p style={{ fontSize: '36px', fontWeight: 300, letterSpacing: '-1px' }}>{candidates.length}</p>
        </div>
        <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '24px' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Offers Extended</h3>
          <p style={{ fontSize: '36px', fontWeight: 300, letterSpacing: '-1px' }}>{candidates.filter(c => c.stage === 'Offer Extended').length}</p>
        </div>
        
        <div className="glass-panel" style={{ gridColumn: 'span 12', padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>lock</span>
          <p>You do not have permission to modify the recruitment pipeline.</p>
        </div>
      </div>
    </div>
  );
}
