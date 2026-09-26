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

  // Status badge styles
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE': return { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.25)', icon: 'play_circle', label: 'Active' };
      case 'COMPLETED': return { bg: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', border: 'rgba(99, 102, 241, 0.25)', icon: 'check_circle', label: 'Completed' };
      case 'ON_HOLD': return { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.25)', icon: 'pause_circle', label: 'On Hold' };
      case 'PLANNING': default: return { bg: 'rgba(14, 165, 233, 0.12)', color: '#38bdf8', border: 'rgba(14, 165, 233, 0.25)', icon: 'edit_note', label: 'Planning' };
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const initialsColors = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#14b8a6', '#f97316'];
  const getInitialsColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return initialsColors[Math.abs(hash) % initialsColors.length];
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'BACKEND': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
      case 'FRONTEND': return { bg: 'rgba(14, 165, 233, 0.1)', color: '#38bdf8' };
      case 'DEVOPS': case 'INFRASTRUCTURE': return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' };
      case 'AI': case 'DATA_SCIENCE': return { bg: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' };
      case 'ARCHITECTURE': return { bg: 'rgba(99, 102, 241, 0.1)', color: '#818cf8' };
      case 'MANAGEMENT': return { bg: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' };
      default: return { bg: 'var(--cutout-bg)', color: 'var(--color-text-secondary)' };
    }
  };

  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = projects.filter(p =>
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = projects.filter(p => p.status === 'ACTIVE').length;
  const totalMembers = projects.reduce((sum: number, p: any) => sum + (p.teamCount || 0), 0);
  const avgProgress = projects.length ? Math.round(projects.reduce((sum: number, p: any) => sum + (p.progress || 0), 0) / projects.length) : 0;

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
          <p style={{ fontSize: '36px', fontWeight: 300, letterSpacing: '-1px' }}>{activeCount}<span style={{ fontSize: '16px', color: 'var(--color-text-secondary)', fontWeight: 400 }}> / {projects.length}</span></p>
          <p style={{ fontSize: '12px', color: '#10b981', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>trending_up</span> {activeCount} currently active</p>
        </div>
        <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '24px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Avg Completion</h3>
          <p style={{ fontSize: '36px', fontWeight: 300, letterSpacing: '-1px' }}>{avgProgress}%</p>
          <div style={{ width: '100%', height: '4px', background: 'var(--cutout-bg)', borderRadius: '2px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{ width: `${avgProgress}%`, height: '100%', background: 'var(--color-ui-element)', transition: 'width 0.5s ease' }}></div>
          </div>
        </div>
        <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '24px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Team Members</h3>
          <p style={{ fontSize: '36px', fontWeight: 300, letterSpacing: '-1px' }}>{totalMembers}</p>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>group</span> Across all projects</p>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1, padding: '10px 16px', background: 'var(--color-glass-surface)', backdropFilter: 'blur(12px)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid var(--glass-border-light)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-text-secondary)' }}>search</span>
          <input
            type="text"
            placeholder="Search projects by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--color-primary)', outline: 'none', fontSize: '14px' }}
          />
          {searchQuery && (
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-text-secondary)', cursor: 'pointer' }} onClick={() => setSearchQuery('')}>close</span>
          )}
        </div>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Project Cards */}
      {filteredProjects.length === 0 ? (
        <div className="glass-panel" style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-text-secondary)', marginBottom: '16px', opacity: 0.5 }}>folder_open</span>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>{searchQuery ? 'No Matching Projects' : 'No Active Projects'}</h4>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '24px', maxWidth: '400px', textAlign: 'center', lineHeight: 1.5 }}>
            {searchQuery ? `No projects match "${searchQuery}".` : 'Get started by creating a new project portfolio.'}
          </p>
          {!searchQuery && (
            <button onClick={() => setIsProjectModalOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span> Create Project
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredProjects.map((proj: any) => {
            const statusStyle = getStatusStyle(proj.status);
            const isExpanded = expandedProjectId === (proj.id || proj._id);

            return (
              <div
                key={proj.id || proj._id}
                className="glass-panel"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  border: isExpanded ? `1px solid ${statusStyle.border}` : undefined
                }}
                onClick={() => setExpandedProjectId(isExpanded ? null : (proj.id || proj._id))}
              >
                {/* Card Header */}
                <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  {/* Status Icon */}
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '10px',
                    background: statusStyle.bg, border: `1px solid ${statusStyle.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: statusStyle.color }}>{statusStyle.icon}</span>
                  </div>

                  {/* Project Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proj.name}</h3>
                      <span style={{
                        padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                        background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}`,
                        textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap'
                      }}>{statusStyle.label}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: isExpanded ? 999 : 1, WebkitBoxOrient: 'vertical' as any }}>
                      {proj.description || 'No description'}
                    </p>
                  </div>

                  {/* Right Side — Team Avatars + Progress */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
                    {/* Team Avatars */}
                    {proj.team && proj.team.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {proj.team.slice(0, 4).map((m: any, i: number) => (
                          <div
                            key={m._id || i}
                            title={`${m.name || 'Team member'} — ${m.role || 'Member'}`}
                            style={{
                              width: '32px', height: '32px', borderRadius: '50%',
                              background: getInitialsColor(m.name || ''),
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '11px', fontWeight: 700, color: '#fff',
                              border: '2px solid var(--color-glass-surface)',
                              marginLeft: i > 0 ? '-8px' : '0',
                              zIndex: 4 - i, position: 'relative'
                            }}
                          >
                            {m.profilePicture ? (
                              <img src={m.profilePicture} alt={m.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : getInitials(m.name || '')}
                          </div>
                        ))}
                        {proj.team.length > 4 && (
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: 'var(--cutout-bg)', border: '2px solid var(--color-glass-surface)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '10px', fontWeight: 600, color: 'var(--color-text-secondary)',
                            marginLeft: '-8px', zIndex: 0, position: 'relative'
                          }}>+{proj.team.length - 4}</div>
                        )}
                      </div>
                    )}

                    {/* Progress */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '100px' }}>
                      <div style={{ flex: 1, height: '6px', background: 'var(--cutout-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${proj.progress || 0}%`, height: '100%', background: statusStyle.color, transition: 'width 0.5s ease' }}></div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: statusStyle.color, minWidth: '32px', textAlign: 'right' }}>{proj.progress || 0}%</span>
                    </div>

                    {/* Expand Arrow */}
                    <span className="material-symbols-outlined" style={{
                      fontSize: '20px', color: 'var(--color-text-secondary)',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease'
                    }}>expand_more</span>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{
                    borderTop: '1px solid var(--cutout-border)', padding: '20px 24px',
                    background: 'var(--cutout-bg)',
                    animation: 'fadeIn 0.2s ease'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                      {/* Left: Team Members */}
                      <div>
                        <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>group</span>
                          Team Members ({proj.teamCount || proj.team?.length || 0})
                        </h4>
                        {(!proj.team || proj.team.length === 0) ? (
                          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>No team members assigned</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {proj.team.map((member: any, i: number) => (
                              <div key={member._id || i} style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '10px 14px', borderRadius: '10px',
                                background: 'var(--color-glass-surface)',
                                border: '1px solid var(--glass-border-light)',
                                transition: 'all 0.2s ease'
                              }}>
                                <div style={{
                                  width: '36px', height: '36px', borderRadius: '50%',
                                  background: getInitialsColor(member.name || ''),
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0
                                }}>
                                  {member.profilePicture ? (
                                    <img src={member.profilePicture} alt={member.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                  ) : getInitials(member.name || '')}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {member.name || 'Unknown'}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                    <span style={{ fontSize: '11px', color: statusStyle.color, fontWeight: 600 }}>{member.role || 'Member'}</span>
                                    {member.department && (
                                      <>
                                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>·</span>
                                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{member.department}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {member.designation && (
                                  <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', background: 'var(--cutout-bg)', padding: '3px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                    {member.designation}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: Required Skills + Metadata */}
                      <div>
                        <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>code</span>
                          Required Skills ({proj.requiredSkills?.length || 0})
                        </h4>
                        {(!proj.requiredSkills || proj.requiredSkills.length === 0) ? (
                          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>No skills specified</p>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                            {proj.requiredSkills.map((skill: any) => {
                              const catColor = getCategoryColor(skill.category);
                              return (
                                <span key={skill.id} style={{
                                  padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                                  background: catColor.bg, color: catColor.color,
                                  border: `1px solid ${catColor.color}22`,
                                  whiteSpace: 'nowrap'
                                }}>
                                  {skill.name}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Metadata */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                          <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--color-glass-surface)', border: '1px solid var(--glass-border-light)' }}>
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Created</div>
                            <div style={{ fontSize: '13px', fontWeight: 500 }}>{formatDate(proj.created)}</div>
                          </div>
                          <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--color-glass-surface)', border: '1px solid var(--glass-border-light)' }}>
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Due Date</div>
                            <div style={{ fontSize: '13px', fontWeight: 500 }}>{formatDate(proj.dueDate)}</div>
                          </div>
                          <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--color-glass-surface)', border: '1px solid var(--glass-border-light)' }}>
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Progress</div>
                            <div style={{ fontSize: '13px', fontWeight: 500 }}>{proj.progress || 0}%</div>
                          </div>
                          <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--color-glass-surface)', border: '1px solid var(--glass-border-light)' }}>
                            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Last Updated</div>
                            <div style={{ fontSize: '13px', fontWeight: 500 }}>{formatDate(proj.updated)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
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
