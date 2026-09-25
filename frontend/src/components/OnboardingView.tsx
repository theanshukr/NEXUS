import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

interface Task {
  _id: string;
  title: string;
  description?: string;
  type: string;
  order: number;
  status: string;
  skillIds: string[];
}

interface Module {
  _id: string;
  title: string;
  description?: string;
  order: number;
  status: string;
  progress: number;
  tasks: Task[];
  skillIds: string[];
}

interface Plan {
  _id: string;
  title: string;
  status: string;
  progress: number;
  source: string;
  designationId?: any;
  projectId?: any;
  modules: Module[];
  createdAt: string;
  updatedAt: string;
}

interface NextAction {
  taskId: string;
  type: string;
  title: string;
  moduleId: string;
}

interface NextActionResponse {
  nextAction: NextAction | null;
  reason: string;
}

interface SkillGuidance {
  skillId: string;
  skillName: string;
  whyItMatters: string;
  recommendedFocus: string[];
  practiceIdea: string;
  estimatedDifficulty: string;
}

interface AIGuidance {
  summary: string;
  skillGuidance: SkillGuidance[];
  nextActionExplanation: string;
  remediationGuidance: string | null;
}

interface AIGuidanceResponse {
  success: boolean;
  aiAvailable: boolean;
  guidance?: AIGuidance;
  error?: { code: string };
  context?: any;
}

export default function OnboardingView({ user }: { user?: any }) {
  const { planId } = useParams<{ planId?: string }>();
  
  if (planId) {
    return <PlanDetailView planId={planId} user={user} />;
  }

  return <PlanListView user={user} />;
}

function PlanListView({ user }: { user?: any }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        // Note: There might not be an explicit GET /plans endpoint provided in instructions 
        // that handles user-specific plans. Using /nexus/onboarding/plans if it exists, 
        // else fallback to some error. Wait, STEP 7A didn't explicitly add GET /plans to the list, 
        // but the prompt says: Allowed: GET plans, GET plan, GET next-action, POST task completion
        const res = await apiClient.get('/nexus/onboarding/plans');
        setPlans(res.data.data || []);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load plans');
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  if (loading) return <div className="page-transition" style={{ padding: '24px' }}>Loading plans...</div>;
  if (error) return <div className="page-transition" style={{ padding: '24px', color: 'red' }}>Error: {error}</div>;

  return (
    <div className="page-transition" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '24px', color: 'var(--color-ui-element)' }}>Workforce Onboarding</h1>
      
      {plans.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          No onboarding plans found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {plans.map(plan => (
            <div key={plan._id} className="glass-panel" style={{ padding: '20px', cursor: 'pointer', transition: 'all 0.2s ease' }} onClick={() => navigate(`../onboarding/${plan._id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--color-ui-element)' }}>{plan.title}</h3>
                <span style={{ 
                  padding: '4px 8px', 
                  borderRadius: '12px', 
                  fontSize: '12px', 
                  fontWeight: 600,
                  backgroundColor: plan.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.2)' : 
                                   plan.status === 'ACTIVE' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  color: plan.status === 'COMPLETED' ? '#34d399' : 
                         plan.status === 'ACTIVE' ? '#38bdf8' : 'var(--color-text-secondary)'
                }}>
                  {plan.status}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                {plan.designationId && <span>Role target: {plan.designationId?.title || 'Unknown Role'}</span>}
                {plan.projectId && <span>Project target: {plan.projectId?.name || 'Unknown Project'}</span>}
              </div>

              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px', color: 'var(--color-text-secondary)' }}>
                  <span>Progress</span>
                  <span>{plan.progress}%</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: plan.status === 'COMPLETED' ? '#34d399' : '#38bdf8', width: `${plan.progress}%`, transition: 'width 0.3s ease' }} />
                </div>
              </div>
              
              {plan.status === 'DRAFT' && (
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '12px', fontStyle: 'italic' }}>
                  Waiting for activation
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanDetailView({ planId, user }: { planId: string, user?: any }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [nextActionRes, setNextActionRes] = useState<NextActionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiGuidance, setAiGuidance] = useState<AIGuidanceResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchPlanAndNextAction = async () => {
    try {
      setLoading(true);
      const [planRes, actionRes] = await Promise.all([
        apiClient.get(`/nexus/onboarding/plans/${planId}`),
        apiClient.get(`/nexus/onboarding/plans/${planId}/next-action`).catch(() => ({ data: null }))
      ]);
      setPlan(planRes.data.data);
      if (actionRes.data) {
        setNextActionRes(actionRes.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  };

  const fetchAIGuidance = async () => {
    setAiLoading(true);
    try {
      const res = await apiClient.get(`/nexus/onboarding/plans/${planId}/ai-guidance`);
      setAiGuidance(res.data);
    } catch {
      setAiGuidance({ success: false, aiAvailable: false, error: { code: 'AI_UNAVAILABLE' } });
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanAndNextAction();
  }, [planId]);

  const handleCompleteTask = async (taskId: string, outcome: string = 'passed') => {
    try {
      setActionLoading(true);
      await apiClient.post(`/nexus/onboarding/plans/${planId}/tasks/${taskId}/complete`, { outcome });
      await fetchPlanAndNextAction();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete task');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="page-transition" style={{ padding: '24px' }}>Loading plan...</div>;
  if (error) return <div className="page-transition" style={{ padding: '24px', color: 'red' }}>Error: {error}</div>;
  if (!plan) return <div className="page-transition" style={{ padding: '24px' }}>Plan not found.</div>;

  return (
    <div className="page-transition" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', margin: '0 0 8px 0', color: 'var(--color-ui-element)' }}>{plan.title}</h1>
        
        <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
          <span>Status: <strong>{plan.status}</strong></span>
          {plan.designationId && <span>Target Role: <strong>{plan.designationId?.title || 'Unknown'}</strong></span>}
          {plan.projectId && <span>Target Project: <strong>{plan.projectId?.name || 'Unknown'}</strong></span>}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px', color: 'var(--color-ui-element)' }}>
            <span>Overall Progress</span>
            <span style={{ fontWeight: 600 }}>{plan.progress}%</span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: plan.progress === 100 ? '#34d399' : '#38bdf8', width: `${plan.progress}%`, transition: 'width 0.4s ease' }} />
          </div>
        </div>
      </div>

      {plan.status === 'COMPLETED' && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
          <h2 style={{ fontSize: '20px', color: '#34d399', margin: '0 0 8px 0' }}>Onboarding Complete</h2>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '14px' }}>All required onboarding modules have been completed.</p>
          <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Final progress: <strong style={{ color: '#34d399' }}>100%</strong>
          </div>
        </div>
      )}

      {plan.status === 'DRAFT' && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', background: 'rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>pending</span>
          <h2 style={{ fontSize: '20px', color: 'var(--color-ui-element)', margin: '0 0 8px 0' }}>DRAFT PLAN</h2>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '14px' }}>Waiting for activation.</p>
        </div>
      )}

      {plan.status === 'ACTIVE' && nextActionRes?.nextAction && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', borderLeft: '4px solid #38bdf8' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Next Action</div>
          
          <h3 style={{ fontSize: '18px', color: 'var(--color-ui-element)', margin: '0 0 16px 0' }}>
            [{nextActionRes.nextAction.title}]
          </h3>
          
          {nextActionRes.nextAction.title.includes('Remediation') && (
            <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#f87171', fontSize: '14px' }}>
              <strong style={{ display: 'block', marginBottom: '4px' }}>❌ Assessment Not Passed</strong>
              Your next step is to complete this remediation practice generated by the adaptive engine.
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            {nextActionRes.nextAction.type === 'ASSESSMENT' ? (
              <>
                <button 
                  className="btn btn-primary"
                  disabled={actionLoading}
                  onClick={() => handleCompleteTask(nextActionRes.nextAction!.taskId, 'passed')}
                  style={{ padding: '10px 20px', background: '#34d399' }}
                >
                  {actionLoading ? 'Processing...' : 'Pass Assessment'}
                </button>
                <button 
                  className="btn btn-glass"
                  disabled={actionLoading}
                  onClick={() => handleCompleteTask(nextActionRes.nextAction!.taskId, 'failed')}
                  style={{ padding: '10px 20px', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                >
                  Fail Assessment
                </button>
              </>
            ) : (
              <button 
                className="btn btn-primary"
                disabled={actionLoading}
                onClick={() => handleCompleteTask(nextActionRes.nextAction!.taskId)}
                style={{ padding: '10px 24px' }}
              >
                {actionLoading ? 'Processing...' : 'Complete Task'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* AI Learning Guidance Panel */}
      {plan.status === 'ACTIVE' && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px', border: '1px solid rgba(167, 139, 250, 0.2)', background: 'rgba(139, 92, 246, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#a78bfa' }}>auto_awesome</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px' }}>
                AI Learning Guidance
              </span>
            </div>
            {!aiGuidance && !aiLoading && (
              <button
                className="btn btn-glass"
                onClick={fetchAIGuidance}
                style={{ padding: '6px 14px', fontSize: '12px', color: '#a78bfa', borderColor: 'rgba(167, 139, 250, 0.3)' }}
              >
                Generate Guidance
              </button>
            )}
            {aiGuidance && (
              <button
                className="btn btn-glass"
                onClick={fetchAIGuidance}
                disabled={aiLoading}
                style={{ padding: '6px 14px', fontSize: '12px', color: 'var(--color-text-secondary)' }}
              >
                Refresh
              </button>
            )}
          </div>

          {aiLoading && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px', display: 'block', marginBottom: '8px', animation: 'spin 1s linear infinite' }}>refresh</span>
              Generating personalized guidance...
            </div>
          )}

          {aiGuidance && !aiLoading && !aiGuidance.success && (
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '6px' }}>cloud_off</span>
              AI guidance is currently unavailable. The onboarding system continues to work normally.
            </div>
          )}

          {aiGuidance?.success && aiGuidance.guidance && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Summary */}
              <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
                {aiGuidance.guidance.summary}
              </div>

              {/* Skill Guidance */}
              {aiGuidance.guidance.skillGuidance.map(sg => (
                <div key={sg.skillId} style={{ padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid rgba(167,139,250,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong style={{ color: '#a78bfa', fontSize: '14px' }}>{sg.skillName}</strong>
                    <span style={{ fontSize: '11px', padding: '2px 6px', background: 'rgba(167,139,250,0.15)', borderRadius: '4px', color: '#a78bfa' }}>
                      {sg.estimatedDifficulty}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 10px 0' }}>
                    <strong style={{ color: 'var(--color-ui-element)' }}>Why it matters: </strong>{sg.whyItMatters}
                  </p>
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ui-element)', marginBottom: '4px' }}>Focus on</div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      {sg.recommendedFocus.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                  <div style={{ fontSize: '13px', padding: '8px 12px', background: 'rgba(167,139,250,0.08)', borderRadius: '6px', borderLeft: '3px solid #a78bfa' }}>
                    <strong style={{ color: '#a78bfa', fontSize: '12px' }}>Practical exercise: </strong>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{sg.practiceIdea}</span>
                  </div>
                </div>
              ))}

              {/* Next Action Explanation */}
              {aiGuidance.guidance.nextActionExplanation && (
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', padding: '12px', background: 'rgba(56,189,248,0.05)', borderRadius: '8px', borderLeft: '3px solid #38bdf8' }}>
                  <strong style={{ color: '#38bdf8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Why this task</strong>
                  {aiGuidance.guidance.nextActionExplanation}
                </div>
              )}

              {/* Remediation Guidance */}
              {aiGuidance.guidance.remediationGuidance && (
                <div style={{ fontSize: '13px', color: '#fbbf24', padding: '12px', background: 'rgba(245,158,11,0.08)', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>Remediation Guidance</strong>
                  {aiGuidance.guidance.remediationGuidance}
                </div>
              )}

              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'right' }}>
                ✨ AI recommendations — not verified facts. Generated from your skill profile.
              </div>
            </div>
          )}

          {!aiGuidance && !aiLoading && (
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
              Click "Generate Guidance" to receive personalized learning recommendations based on your skills and experience.
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '16px', color: 'var(--color-ui-element)', margin: '16px 0 8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>Modules</h3>
        
        {plan.modules.map((mod, i) => (
          <div key={mod._id} className="glass-panel" style={{ padding: '20px', border: mod.status === 'COMPLETED' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--color-ui-element)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                MODULE {i + 1}: {mod.title}
                {mod.status === 'COMPLETED' && <span className="material-symbols-outlined" style={{ color: '#34d399', fontSize: '18px' }}>check_circle</span>}
                {mod.status === 'BLOCKED' && <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)', fontSize: '18px' }}>lock</span>}
              </h4>
              <span style={{ fontSize: '14px', fontWeight: 600, color: mod.progress === 100 ? '#34d399' : 'var(--color-text-secondary)' }}>{mod.progress}%</span>
            </div>

            <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ height: '100%', background: mod.progress === 100 ? '#34d399' : '#38bdf8', width: `${mod.progress}%` }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {mod.tasks.map(task => {
                const isCompleted = task.status === 'COMPLETED' || task.status === 'SKIPPED';
                const isNext = nextActionRes?.nextAction?.taskId === task._id;
                
                return (
                  <div key={task._id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    padding: '10px 12px', 
                    background: isNext ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.03)', 
                    borderRadius: '6px',
                    borderLeft: isNext ? '3px solid #38bdf8' : '3px solid transparent'
                  }}>
                    {isCompleted ? (
                      <span className="material-symbols-outlined" style={{ color: '#34d399', fontSize: '18px' }}>check</span>
                    ) : isNext ? (
                      <span className="material-symbols-outlined" style={{ color: '#38bdf8', fontSize: '18px' }}>arrow_forward</span>
                    ) : (
                      <span className="material-symbols-outlined" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '18px' }}>radio_button_unchecked</span>
                    )}
                    <span style={{ 
                      fontSize: '14px', 
                      color: isCompleted ? 'var(--color-text-secondary)' : isNext ? 'var(--color-ui-element)' : 'var(--color-text-secondary)',
                      textDecoration: isCompleted ? 'line-through' : 'none',
                      flex: 1
                    }}>
                      {task.title}
                    </span>
                    <span style={{ fontSize: '11px', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', color: 'var(--color-text-secondary)' }}>
                      {task.type}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
