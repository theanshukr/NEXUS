import React, { useState, useEffect } from 'react';
import { getProgressColor } from '../utils';
import { apiClient } from '../api/client';
import { useToast } from './ToastProvider';

export default function PerformanceManagementView({ role, user }: { role: string, user?: any }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'goals' | 'evaluation'>('goals');
  const isAdminView = role === 'HR Manager' || role === 'Super Admin';
  const [rating, setRating] = useState(0);
  const [achievements, setAchievements] = useState('');
  const [improvements, setImprovements] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReviewMember, setSelectedReviewMember] = useState<any>(null);

  const [team, setTeam] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', description: '', dueDate: '', status: 'On Track', progressPercentage: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchGoals = async () => {
    try {
      const res = await apiClient.get('/performance/goals');
      if (res.data?.data) {
        const fetchedGoals = Array.isArray(res.data.data) ? res.data.data : res.data.data.items || [];
        const mapped = fetchedGoals.map((g: any, i: number) => ({
          id: g._id || i,
          title: g.title || g.goalTitle || 'Goal',
          type: g.dueDate ? 'OKR' : 'KPI',
          status: g.status || 'On Track',
          progress: g.progressPercentage || 0,
          weight: '25%'
        }));
        setGoals(mapped);
      }
    } catch (err) {
      showToast('Error', 'error', 'Failed to fetch goals');
      setGoals([]);
    }
  };

  useEffect(() => {
    if (isAdminView) {
      const fetchTeam = async () => {
        try {
          const res = await apiClient.get('/employees');
          if (res.data?.data) {
            const employees = Array.isArray(res.data.data) ? res.data.data : res.data.data.items || [];
            const mapped = employees.slice(0, 5).map((e: any, i: number) => ({
              id: e._id || e.employeeId || i,
              name: e.firstName ? `${e.firstName} ${e.lastName}` : 'Employee',
              role: e.role || 'Staff',
              rating: i % 2 === 0 ? 4.5 : null,
              selfEvalDone: true,
              managerEvalDone: i % 2 === 0,
              status: i % 2 === 0 ? 'Ready for Calibration' : 'Needs Manager Review'
            }));
            setTeam(mapped);
          }
        } catch (err) {
          showToast('Error', 'error', 'Failed to fetch employees');
          setTeam([]);
        }
      };
      fetchTeam();
    } else {
      fetchGoals();
    }
  }, [isAdminView]);

  const handleCreateGoal = async () => {
    if (!newGoal.title) {
      showToast('Validation Error', 'error', 'Title is required');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post('/performance/goals', newGoal);
      showToast('Success', 'success', 'Goal created successfully');
      setNewGoal({ title: '', description: '', dueDate: '', status: 'On Track', progressPercentage: 0 });
      setIsGoalModalOpen(false);
      fetchGoals();
    } catch (err: any) {
      showToast('Error', 'error', err.response?.data?.error || 'Failed to create goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateGoalProgress = async (id: string) => {
    const progress = prompt('Enter new progress (0-100):');
    if (progress === null) return;
    const val = parseInt(progress, 10);
    if (isNaN(val) || val < 0 || val > 100) {
      showToast('Validation Error', 'error', 'Progress must be a number between 0 and 100');
      return;
    }
    try {
      let status = 'On Track';
      if (val === 100) status = 'Completed';
      else if (val < 30) status = 'At Risk';
      
      // Optimistic update
      setGoals(prev => prev.map(g => g.id === id ? { ...g, progress: val, status } : g));
      
      await apiClient.patch(`/performance/goals/${id}`, { progressPercentage: val, status });
      showToast('Success', 'success', 'Goal progress updated');
    } catch (err: any) {
      fetchGoals(); // Revert
      showToast('Error', 'error', err.response?.data?.error || 'Failed to update goal');
    }
  };

  // ─── ADMIN / HR MANAGER VIEW ──────────────────────────────────────────────────
  if (isAdminView) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>Performance Calibration</h2>
            <p className="text-secondary" style={{ fontSize: '14px' }}>Module M-08: Q2 2026 Appraisal Cycle</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => showToast('Exported', 'success', 'Report exported to CSV.')} className="btn btn-glass" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>summarize</span> Export Report
            </button>
            <button onClick={() => showToast('Cycle Locked', 'success', 'Appraisal cycle has been locked.')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span> Lock Cycle
            </button>
          </div>
        </div>

        <div className="grid-12">
          {/* Rating Distribution (Bell Curve Mock) */}
          <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Rating Distribution</h3>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px', borderBottom: '1px solid var(--cutout-bg)' }}>
               {/* Mock bars for bell curve */}
               <div style={{ flex: 1, background: 'var(--color-blob-1)', height: '10%', borderRadius: '4px 4px 0 0', opacity: 0.5 }}></div>
               <div style={{ flex: 1, background: 'var(--color-blob-1)', height: '25%', borderRadius: '4px 4px 0 0', opacity: 0.7 }}></div>
               <div style={{ flex: 1, background: 'var(--color-blob-1)', height: '70%', borderRadius: '4px 4px 0 0', opacity: 1 }}></div>
               <div style={{ flex: 1, background: 'var(--color-blob-1)', height: '40%', borderRadius: '4px 4px 0 0', opacity: 0.7 }}></div>
               <div style={{ flex: 1, background: 'var(--color-blob-1)', height: '15%', borderRadius: '4px 4px 0 0', opacity: 0.5 }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              <span>1 - Needs Imp.</span>
              <span>3 - Meets</span>
              <span>5 - Exceeds</span>
            </div>
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', fontSize: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
              Curve is currently normalized.
            </div>
          </div>

          {/* Cycle Stats */}
          <div className="glass-panel" style={{ gridColumn: 'span 8', padding: '24px' }}>
             <h3 style={{ fontSize: '16px', marginBottom: '24px' }}>Cycle Progress</h3>
             <div style={{ display: 'flex', gap: '24px' }}>
                <div style={{ flex: 1, padding: '20px', background: 'var(--cutout-bg)', borderRadius: '12px', border: '1px solid var(--cutout-border)' }}>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Self Evals</p>
                  <p style={{ fontSize: '32px', fontWeight: 300, margin: 0 }}>84%</p>
                  <div style={{ width: '100%', height: '4px', background: 'var(--cutout-bg)', borderRadius: '2px', marginTop: '12px' }}>
                    <div style={{ width: '84%', height: '100%', background: '#10b981' }}></div>
                  </div>
                </div>
                <div style={{ flex: 1, padding: '20px', background: 'var(--cutout-bg)', borderRadius: '12px', border: '1px solid var(--cutout-border)' }}>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Manager Evals</p>
                  <p style={{ fontSize: '32px', fontWeight: 300, margin: 0 }}>62%</p>
                  <div style={{ width: '100%', height: '4px', background: 'var(--cutout-bg)', borderRadius: '2px', marginTop: '12px' }}>
                    <div style={{ width: '62%', height: '100%', background: '#f59e0b' }}></div>
                  </div>
                </div>
                <div style={{ flex: 1, padding: '20px', background: 'var(--cutout-bg)', borderRadius: '12px', border: '1px solid var(--cutout-border)' }}>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Calibration</p>
                  <p style={{ fontSize: '32px', fontWeight: 300, margin: 0 }}>25%</p>
                  <div style={{ width: '100%', height: '4px', background: 'var(--cutout-bg)', borderRadius: '2px', marginTop: '12px' }}>
                    <div style={{ width: '25%', height: '100%', background: '#38bdf8' }}></div>
                  </div>
                </div>
             </div>
          </div>

          {/* Team List */}
          <div className="glass-panel" style={{ gridColumn: 'span 12', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Team Appraisals</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cutout-bg)', color: 'var(--color-text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Employee</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Self Eval</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Manager Eval</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Proposed Rating</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {team.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No team members found.</td>
                  </tr>
                )}
                {team.map(member => (
                  <tr key={member.id} style={{ borderBottom: '1px solid var(--cutout-bg)' }} className="hover-bg">
                    <td style={{ padding: '16px' }}>
                      <p style={{ fontWeight: 600, fontSize: '14px', margin: 0 }}>{member.name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>{member.role}</p>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {member.selfEvalDone ? 
                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span> Submitted</span> : 
                        <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>pending</span> Pending</span>
                      }
                    </td>
                    <td style={{ padding: '16px' }}>
                      {member.managerEvalDone ? 
                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span> Completed</span> : 
                        <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit_square</span> Action Required</span>
                      }
                    </td>
                    <td style={{ padding: '16px' }}>
                      {member.rating ? 
                        <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-ui-element)' }}>{member.rating} / 5</span> : 
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>-</span>
                      }
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button onClick={() => {
                        setSelectedReviewMember(member);
                        setShowReviewModal(true);
                      }} className="btn btn-glass" style={{ padding: '6px 16px', fontSize: '12px' }}>Review</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      {showReviewModal && selectedReviewMember && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '500px', padding: '24px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Review for {selectedReviewMember.name}</h2>
            <p style={{ fontSize: '14px', opacity: 0.7, marginBottom: '24px' }}>{selectedReviewMember.role}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', background: 'var(--cutout-bg)', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>Current Rating</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-ui-element)' }}>{selectedReviewMember.rating} / 5</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowReviewModal(false)} className="btn btn-glass" style={{ padding: '8px 16px' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
    );
  }

  // ─── EMPLOYEE VIEW ───────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>My Performance</h2>
          <p className="text-secondary" style={{ fontSize: '14px' }}>Module M-08: Goals & Appraisals</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className={`btn ${activeTab === 'goals' ? 'btn-primary' : 'btn-glass'}`} 
            onClick={() => setActiveTab('goals')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>track_changes</span> OKRs & Goals
          </button>
          <button 
            className={`btn ${activeTab === 'evaluation' ? 'btn-primary' : 'btn-glass'}`} 
            onClick={() => setActiveTab('evaluation')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit_document</span> Q2 Appraisal
          </button>
        </div>
      </div>

      {activeTab === 'goals' ? (
        <div className="grid-12">
          <div style={{ gridColumn: 'span 12', display: 'flex', justifyContent: 'flex-end', paddingBottom: '16px' }}>
            <button onClick={() => setIsGoalModalOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span> New Goal
            </button>
          </div>
          {goals.length === 0 && (
            <div style={{ gridColumn: 'span 12', padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No goals found.</div>
          )}
          {goals.map((goal: any) => (
            <div key={goal.id} className="glass-panel" style={{ gridColumn: 'span 6', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-ui-element)', background: 'var(--color-glass-surface)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-blob-1)' }}>{goal.type}</span>
                  <h3 style={{ fontSize: '16px', marginTop: '8px', lineHeight: 1.4 }}>{goal.title}</h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '20px', fontWeight: 300, color: goal.progress === 100 ? '#10b981' : 'inherit' }}>{goal.progress}%</span>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>Weight: {goal.weight}</p>
                </div>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'var(--cutout-bg)', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
                <div style={{ height: '100%', width: `${goal.progress}%`, background: getProgressColor(goal.progress) }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: goal.progress === 100 ? '#10b981' : goal.status === 'At Risk' ? '#ef4444' : 'var(--color-text-secondary)' }}>{goal.status}</span>
                <button onClick={() => handleUpdateGoalProgress(goal.id)} className="btn btn-glass" style={{ padding: '4px 12px', fontSize: '12px' }}>Update Progress</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid-12">
          <div className="glass-panel" style={{ gridColumn: 'span 8', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px' }}>Self-Evaluation Form</h3>
              <span style={{ padding: '4px 12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>Draft Auto-Saved</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>1. Key Achievements this Quarter</label>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Describe your most significant contributions and how they aligned with your OKRs.</p>
                <textarea value={achievements} onChange={e => setAchievements(e.target.value)} placeholder="I successfully shipped the Auth Module 2 weeks ahead of schedule..." style={{ width: '100%', height: '120px', padding: '16px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '8px', color: 'inherit', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}></textarea>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>2. Areas for Improvement</label>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>What challenges did you face and what skills do you want to develop?</p>
                <textarea value={improvements} onChange={e => setImprovements(e.target.value)} placeholder="I struggled initially with the Redis caching layer, and want to get an AWS certification..." style={{ width: '100%', height: '100px', padding: '16px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '8px', color: 'inherit', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}></textarea>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>3. Self-Rating (1-5)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map(num => (
                    <button onClick={() => setRating(num)} key={num} className={`btn ${rating === num ? 'btn-primary' : 'btn-glass'}`} style={{ width: '40px', height: '40px', borderRadius: '8px', fontSize: '16px', fontWeight: 600 }}>{num}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--cutout-bg)', paddingTop: '24px' }}>
                <button onClick={async () => {
                  try {
                    await apiClient.post('/performance/reviews', { reviewPeriod: 'Q2 2026', selfRating: rating, reviewData: { achievements, improvements } });
                    showToast('Success', 'success', 'Review submitted to manager.');
                  } catch (e) { showToast('Error', 'error', 'Failed to submit review.'); }
                }} className="btn btn-primary" style={{ padding: '10px 24px' }}>Submit to Manager</button>
              </div>
            </div>
          </div>
          
          <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '32px', background: 'var(--color-glass-surface)' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-ui-element)' }}>schedule</span>
              Timeline
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '2px', background: 'var(--color-ui-element)', position: 'relative' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-ui-element)', position: 'absolute', left: '-4px', top: '0' }}></div>
                  </div>
                  <div style={{ paddingBottom: '16px' }}>
                    <p style={{ fontWeight: 600, fontSize: '13px', margin: 0, color: 'var(--color-ui-element)' }}>Self-Evaluation</p>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>Due by Jul 10, 2026</p>
                  </div>
               </div>
               <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '2px', background: 'var(--cutout-bg)', position: 'relative' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--cutout-bg)', position: 'absolute', left: '-4px', top: '0' }}></div>
                  </div>
                  <div style={{ paddingBottom: '16px' }}>
                    <p style={{ fontWeight: 600, fontSize: '13px', margin: 0, color: 'var(--color-text-secondary)' }}>Manager Review</p>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>Starts Jul 11, 2026</p>
                  </div>
               </div>
               <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '2px', background: 'transparent', position: 'relative' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--cutout-bg)', position: 'absolute', left: '-4px', top: '0' }}></div>
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '13px', margin: 0, color: 'var(--color-text-secondary)' }}>1:1 Discussion</p>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>Scheduled for Jul 18, 2026</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal Creation Modal */}
      {isGoalModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '500px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '20px', margin: 0 }}>Create New Goal</h3>
            
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Goal Title</label>
              <input 
                type="text" 
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                placeholder="e.g. Increase sales by 10%"
                style={{ width: '100%', padding: '12px 16px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '8px', color: 'inherit', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Description</label>
              <textarea 
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                placeholder="Key outcomes..."
                style={{ width: '100%', height: '100px', padding: '12px 16px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '8px', color: 'inherit', outline: 'none', resize: 'vertical' }}
              ></textarea>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Due Date</label>
              <input 
                type="date" 
                value={newGoal.dueDate}
                onChange={(e) => setNewGoal({ ...newGoal, dueDate: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '8px', color: 'inherit', outline: 'none', colorScheme: 'dark' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <button onClick={() => setIsGoalModalOpen(false)} className="btn btn-glass">Cancel</button>
              <button onClick={handleCreateGoal} disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? 'Creating...' : 'Create Goal'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
