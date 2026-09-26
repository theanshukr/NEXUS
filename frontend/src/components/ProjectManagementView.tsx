import React, { useState, useEffect } from 'react';
import { getProgressColor } from '../utils';
import { apiClient } from '../api/client';
import { useToast } from './ToastProvider';

export default function ProjectManagementView({ role, user }: { role: string, user?: any }) {
  const [activeTab, setActiveTab] = useState<'kanban' | 'projects' | 'timesheet'>('kanban');
  const { showToast } = useToast();
  const [projects, setProjects] = useState<any[]>([]);

  const formatDate = (dateStr: any) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };
  const [tasks, setTasks] = useState<any[]>([]);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'MEDIUM', deadline: '' });
  
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProject, setNewProject] = useState<{ name: string, description: string, dueDate: string, requiredSkillIds: string[] }>({ name: '', description: '', dueDate: '', requiredSkillIds: [] });
  
  const [availableSkills, setAvailableSkills] = useState<any[]>([]);
  const [skillSearchTerm, setSkillSearchTerm] = useState('');
  const [isSkillsLoading, setIsSkillsLoading] = useState(false);
  const [skillsError, setSkillsError] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProjectsAndTasks = async () => {
    try {
      const projRes = await apiClient.get('/projects');
      if (projRes.data?.data) {
        setProjects(Array.isArray(projRes.data.data) ? projRes.data.data : projRes.data.data.items || []);
      }
    } catch (err) {
      showToast('Error', 'error', 'Failed to fetch projects');
      setProjects([]);
    }
    try {
      const tasksRes = await apiClient.get('/projects/tasks');
      if (tasksRes.data?.data) {
        setTasks(Array.isArray(tasksRes.data.data) ? tasksRes.data.data : tasksRes.data.data.items || []);
      }
    } catch (err) {
      showToast('Error', 'error', 'Failed to fetch tasks');
      setTasks([]);
    }
  };

  const fetchSkills = async () => {
    setIsSkillsLoading(true);
    setSkillsError(false);
    try {
      const res = await apiClient.get('/nexus/skills');
      if (res.data?.data) {
        setAvailableSkills(res.data.data);
      } else if (Array.isArray(res.data)) {
        setAvailableSkills(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch skills:', err);
      setSkillsError(true);
    } finally {
      setIsSkillsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectsAndTasks();
    fetchSkills();
  }, []);

  const handleCreateTask = async () => {
    if (!newTask.title) {
      showToast('Validation Error', 'error', 'Title is required');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post('/projects/tasks', newTask);
      showToast('Success', 'success', 'Task created successfully');
      setNewTask({ title: '', description: '', priority: 'MEDIUM', deadline: '' });
      setIsTaskModalOpen(false);
      fetchProjectsAndTasks();
    } catch (err: any) {
      showToast('Error', 'error', err.response?.data?.error?.message || err.response?.data?.error || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name) {
      showToast('Validation Error', 'error', 'Project name is required');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post('/projects', newProject);
      showToast('Success', 'success', 'Project created successfully');
      setNewProject({ name: '', description: '', dueDate: '', requiredSkillIds: [] });
      setIsProjectModalOpen(false);
      fetchProjectsAndTasks();
    } catch (err: any) {
      showToast('Error', 'error', err.response?.data?.error?.message || err.response?.data?.error || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      // Optimistic UI update
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      await apiClient.patch(`/projects/tasks/${taskId}/status`, { status: newStatus });
      showToast('Success', 'success', 'Task status updated');
    } catch (err: any) {
      fetchProjectsAndTasks(); // Revert on failure
      showToast('Error', 'error', 'Failed to update task status');
    }
  };

  // Helper to render priority badges
  const renderPriority = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return <span style={{ padding: '4px 8px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '10px', fontWeight: 700, borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>CRITICAL</span>;
      case 'HIGH': return <span style={{ padding: '4px 8px', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', fontSize: '10px', fontWeight: 700, borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>HIGH</span>;
      case 'MEDIUM': return <span style={{ padding: '4px 8px', background: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8', fontSize: '10px', fontWeight: 700, borderRadius: '4px', border: '1px solid rgba(14, 165, 233, 0.3)' }}>MEDIUM</span>;
      case 'LOW': return <span style={{ padding: '4px 8px', background: 'rgba(167, 139, 250, 0.2)', color: '#a78bfa', fontSize: '10px', fontWeight: 700, borderRadius: '4px', border: '1px solid rgba(167, 139, 250, 0.3)' }}>LOW</span>;
      default: return null;
    }
  };

  if (role === 'Standard Employee') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>My Tasks & Projects</h2>
            <p className="text-secondary" style={{ fontSize: '14px' }}>Module M-09: Sprint Tracking & Kanban</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
             <button onClick={() => {
               const hours = prompt('Enter hours to log for today:');
               if (hours) showToast('Success', 'success', `Logged ${hours} hours to your timesheet.`);
             }} className="btn btn-glass" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>timer</span> Log Time
             </button>
             <button onClick={() => setIsTaskModalOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span> New Task
             </button>
          </div>
        </div>

        {/* Kanban Board */}
        {tasks.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--cutout-bg)', borderRadius: '12px', border: '1px dashed var(--cutout-border)', minHeight: '300px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-text-secondary)', marginBottom: '16px', opacity: 0.5 }}>view_kanban</span>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Sprint Tracking coming soon</h4>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '24px', maxWidth: '400px', textAlign: 'center', lineHeight: 1.5 }}>
              Task management and timesheet integration will be available in the upcoming Q4 release.
            </p>
          </div>
        )}
        <div style={{ display: tasks.length > 0 ? 'flex' : 'none', gap: '24px', overflowX: 'auto', paddingBottom: '16px', flex: 1 }}>
          {/* TO DO Column */}
          <div 
            style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: '16px' }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleTaskStatusChange(e.dataTransfer.getData('taskId'), 'TO_DO')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>To Do</h3>
              <span style={{ background: 'var(--color-glass-surface)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{tasks.filter(t => t.status === 'TO_DO').length}</span>
            </div>
            
            {tasks.filter(t => t.status === 'TO_DO').map(task => (
              <div 
                key={task.id} 
                className="glass-cutout interactive" 
                draggable
                onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'grab' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  {renderPriority(task.priority)}
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}><span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>schedule</span>{task.deadline}</span>
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, margin: 0, lineHeight: 1.4 }}>{task.title}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-blob-1)' }}></div>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{task.project}</span>
                </div>
              </div>
            ))}
          </div>

          {/* IN PROGRESS Column */}
          <div 
            style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: '16px' }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleTaskStatusChange(e.dataTransfer.getData('taskId'), 'IN_PROGRESS')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ui-element)', textTransform: 'uppercase', letterSpacing: '1px' }}>In Progress</h3>
              <span style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#38bdf8', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{tasks.filter(t => t.status === 'IN_PROGRESS').length}</span>
            </div>
            
            {tasks.filter(t => t.status === 'IN_PROGRESS').map(task => (
              <div 
                key={task.id} 
                className="glass-cutout interactive" 
                draggable
                onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'grab', borderLeft: '3px solid var(--color-primary)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  {renderPriority(task.priority)}
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}><span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>schedule</span>{task.deadline}</span>
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, margin: 0, lineHeight: 1.4 }}>{task.title}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-blob-1)' }}></div>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{task.project}</span>
                </div>
              </div>
            ))}
          </div>

          {/* DONE Column */}
          <div 
            style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: '16px' }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleTaskStatusChange(e.dataTransfer.getData('taskId'), 'DONE')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#10b981', textTransform: 'uppercase', letterSpacing: '1px' }}>Done</h3>
              <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{tasks.filter(t => t.status === 'DONE').length}</span>
            </div>
            
            {tasks.filter(t => t.status === 'DONE').map(task => (
              <div 
                key={task.id} 
                className="glass-cutout interactive" 
                draggable
                onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'grab', opacity: 0.7 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  {renderPriority(task.priority)}
                  <span style={{ fontSize: '12px', color: '#10b981' }}><span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>check_circle</span>Completed</span>
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, margin: 0, lineHeight: 1.4, textDecoration: 'line-through' }}>{task.title}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-blob-1)' }}></div>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{task.project}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Creation Modal */}
        {isTaskModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ width: '500px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '20px', margin: 0 }}>Create New Task</h3>
              
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Task Title</label>
                <input 
                  type="text" 
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="e.g. Update user authentication logic"
                  style={{ width: '100%', padding: '12px 16px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '8px', color: 'inherit', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Description</label>
                <textarea 
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Additional details..."
                  style={{ width: '100%', height: '100px', padding: '12px 16px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '8px', color: 'inherit', outline: 'none', resize: 'vertical' }}
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Priority</label>
                  <select 
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '8px', color: 'inherit', outline: 'none' }}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Deadline (optional)</label>
                  <input 
                    type="text" 
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                    placeholder="e.g. Oct 15"
                    style={{ width: '100%', padding: '12px 16px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '8px', color: 'inherit', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button onClick={() => setIsTaskModalOpen(false)} className="btn btn-glass">Cancel</button>
                <button onClick={handleCreateTask} disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? 'Creating...' : 'Create Task'}</button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // Manager / Admin View
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>Project Portfolio</h2>
          <p className="text-secondary" style={{ fontSize: '14px' }}>Module M-09: Budget & Resource Tracking</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setIsProjectModalOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span> New Project
          </button>
        </div>
      </div>

      <div className="grid-12">
        {/* KPI Cards */}
        <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '24px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Active Projects</h3>
          <p style={{ fontSize: '36px', fontWeight: 300, letterSpacing: '-1px' }}>{projects.length}</p>
          <p style={{ fontSize: '12px', color: '#10b981', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>trending_up</span> +3 this quarter</p>
        </div>
        <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '24px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Avg Completion</h3>
          <p style={{ fontSize: '36px', fontWeight: 300, letterSpacing: '-1px' }}>64%</p>
          <div style={{ width: '100%', height: '4px', background: 'var(--cutout-bg)', borderRadius: '2px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{ width: '64%', height: '100%', background: 'var(--color-ui-element)' }}></div>
          </div>
        </div>
        <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '24px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(255,255,255,0) 100%)' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Burn Rate Alert</h3>
          <p style={{ fontSize: '36px', fontWeight: 300, letterSpacing: '-1px', color: '#f59e0b' }}>2 Projects</p>
          <p style={{ fontSize: '12px', color: '#f59e0b', marginTop: '8px' }}>Exceeding 90% of allocated budget</p>
        </div>

        {/* Project List */}
        <div className="glass-panel" style={{ gridColumn: 'span 12', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
             <h3 style={{ fontSize: '18px' }}>Active Directory</h3>
             <div style={{ display: 'flex', gap: '16px' }}>
               <div style={{ padding: '8px 16px', background: 'var(--cutout-bg)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)', border: '1px solid var(--cutout-border)' }}>
                 <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>search</span>
                 <input type="text" placeholder="Search projects..." style={{ background: 'transparent', border: 'none', color: 'inherit', outline: 'none', width: '200px' }} />
               </div>
             </div>
          </div>

          {projects.length === 0 ? (
            <div style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--cutout-bg)', borderRadius: '12px', border: '1px dashed var(--cutout-border)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-text-secondary)', marginBottom: '16px', opacity: 0.5 }}>folder_open</span>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>No Active Projects</h4>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '24px', maxWidth: '400px', textAlign: 'center', lineHeight: 1.5 }}>
                Get started by creating a new project portfolio.
              </p>
              <button onClick={() => setIsProjectModalOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                Create Project
              </button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cutout-bg)', color: 'var(--color-text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Project Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Progress</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(proj => (
                  <tr key={proj.id || proj._id} style={{ borderBottom: '1px solid var(--cutout-bg)' }} className="hover-bg">
                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: 500 }}>{proj.name}</td>
                    <td style={{ padding: '16px', fontSize: '13px' }}>{proj.status}</td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ flex: 1, height: '6px', background: 'var(--cutout-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${proj.progress || 0}%`, height: '100%', background: 'var(--color-primary)' }}></div>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', width: '30px' }}>{proj.progress || 0}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{formatDate(proj.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {/* Project Creation Modal */}
      {isProjectModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '500px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '20px', margin: 0 }}>Create New Project</h3>
            
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Project Name</label>
              <input 
                type="text" 
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="e.g. Q4 Marketing Campaign"
                style={{ width: '100%', padding: '12px 16px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '8px', color: 'inherit', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Description</label>
              <textarea 
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="Project objectives..."
                style={{ width: '100%', height: '100px', padding: '12px 16px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '8px', color: 'inherit', outline: 'none', resize: 'vertical' }}
              ></textarea>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Due Date (optional)</label>
              <input 
                type="date" 
                value={newProject.dueDate}
                onChange={(e) => setNewProject({ ...newProject, dueDate: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '8px', color: 'inherit', outline: 'none', colorScheme: 'dark' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Required Skills</label>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                {newProject.requiredSkillIds.map(skillId => {
                  const skill = availableSkills.find(s => s._id === skillId || s.id === skillId);
                  return skill ? (
                    <div key={skillId} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--color-primary)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                      {skill.canonicalName}
                      <span 
                        className="material-symbols-outlined" 
                        style={{ fontSize: '14px', cursor: 'pointer' }}
                        onClick={() => setNewProject(prev => ({ ...prev, requiredSkillIds: prev.requiredSkillIds.filter(id => id !== skillId) }))}
                      >
                        close
                      </span>
                    </div>
                  ) : null;
                })}
              </div>

              <input 
                type="text" 
                value={skillSearchTerm}
                onChange={(e) => setSkillSearchTerm(e.target.value)}
                placeholder="Search and select skills..."
                style={{ width: '100%', padding: '12px 16px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '8px', color: 'inherit', outline: 'none' }}
              />

              {skillSearchTerm && (
                <div style={{ maxHeight: '150px', overflowY: 'auto', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '8px', marginTop: '4px' }}>
                  {isSkillsLoading ? (
                    <div style={{ padding: '8px 16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>Loading skills...</div>
                  ) : skillsError ? (
                    <div style={{ padding: '8px 16px', fontSize: '13px', color: '#ef4444' }}>Unable to load skills</div>
                  ) : (
                    <>
                      {availableSkills
                        .filter(s => (s.canonicalName || '').toLowerCase().includes(skillSearchTerm.toLowerCase()))
                        .filter(s => !newProject.requiredSkillIds.includes(s._id) && !newProject.requiredSkillIds.includes(s.id))
                        .map(skill => (
                          <div 
                            key={skill._id || skill.id}
                            style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}
                            className="hover-bg interactive"
                            onClick={() => {
                              setNewProject(prev => ({ ...prev, requiredSkillIds: [...prev.requiredSkillIds, skill._id || skill.id] }));
                              setSkillSearchTerm('');
                            }}
                          >
                            {skill.canonicalName}
                          </div>
                        ))
                      }
                      {availableSkills.filter(s => (s.canonicalName || '').toLowerCase().includes(skillSearchTerm.toLowerCase())).length === 0 && (
                        <div style={{ padding: '8px 16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>No matching skills found</div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <button onClick={() => setIsProjectModalOpen(false)} className="btn btn-glass">Cancel</button>
              <button onClick={handleCreateProject} disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? 'Creating...' : 'Create Project'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
