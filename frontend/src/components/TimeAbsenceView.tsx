import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useToast } from './ToastProvider';



const RequestLeaveModal = ({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    leaveCode: 'CASUAL LEAVE',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        startDate: formData.startDate,
        endDate: formData.endDate
      };
      await apiClient.post('/leave/requests', payload);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error?.message || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', color: 'var(--color-text)', border: '1px solid var(--glass-border-light)', borderRadius: '12px', outline: 'none', fontSize: '14px', fontFamily: 'inherit', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' };
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out' }}>
      <div className="glass-panel" style={{ width: '440px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>Request Leave</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Leave Type</label>
            <select value={formData.leaveCode} onChange={e => setFormData({...formData, leaveCode: e.target.value})} style={{...inputStyle, appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23999%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '12px auto' }}>
              <option value="CASUAL LEAVE" style={{color: 'black'}}>Casual Leave</option>
              <option value="SICK LEAVE" style={{color: 'black'}}>Sick Leave</option>
              <option value="EARNED LEAVE" style={{color: 'black'}}>Earned Leave</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Start Date</label>
              <input type="date" required value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>End Date</label>
              <input type="date" required value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Reason</label>
            <textarea required placeholder="Briefly describe the reason for your leave..." value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}></textarea>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '20px', borderTop: '1px solid var(--glass-border-light)' }}>
            <button type="button" onClick={onClose} className="btn btn-glass" disabled={loading} style={{ padding: '10px 20px' }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '10px 24px' }}>{loading ? 'Submitting...' : 'Submit Request'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CustomEventModal = ({ day, onClose, onSave }: { day: number, onClose: () => void, onSave: (event: { day: number, title: string, type: string }) => void }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Task');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ day, title, type });
    onClose();
  };

  const inputStyle = { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', color: 'var(--color-text)', border: '1px solid var(--glass-border-light)', borderRadius: '12px', outline: 'none', fontSize: '14px', fontFamily: 'inherit', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' };
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out' }}>
      <div className="glass-panel" style={{ width: '400px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Add Event to Aug {day}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Event Title</label>
            <input type="text" autoFocus required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Doctor Appointment" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Event Type</label>
            <select value={type} onChange={e => setType(e.target.value)} style={{...inputStyle, appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23999%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '12px auto' }}>
              <option value="Task" style={{color: 'black'}}>Task</option>
              <option value="Reminder" style={{color: 'black'}}>Reminder</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '20px', borderTop: '1px solid var(--glass-border-light)' }}>
            <button type="button" onClick={onClose} className="btn btn-glass" style={{ padding: '10px 20px' }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }}>Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MonthCalendar = ({ titlePrefix, legend, renderDay }: { titlePrefix?: string, legend: React.ReactNode, renderDay: (day: number, isWeekend: boolean, isToday: boolean, month: number, year: number) => React.ReactNode }) => {
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 7, 1)); // Start at August 2026

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const displayTitle = titlePrefix ? `${titlePrefix} (${monthName})` : monthName;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const startingIndex = firstDay === 0 ? 6 : firstDay - 1;

  const blanks = Array.from({ length: startingIndex }).map((_, i) => (
    <div key={`blank-${i}`} style={{ background: 'transparent' }}></div>
  ));

  return (
    <div className="glass-panel" style={{ gridColumn: 'span 12', padding: '32px', display: 'flex', flexDirection: 'column', marginTop: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h3 style={{ fontSize: '20px', margin: 0 }}>{displayTitle}</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handlePrevMonth} className="btn btn-glass" style={{ padding: '4px', display: 'flex' }}><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span></button>
            <button onClick={handleNextMonth} className="btn btn-glass" style={{ padding: '4px', display: 'flex' }}><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span></button>
          </div>
          <button onClick={() => document.dispatchEvent(new CustomEvent('openAddTaskModal', { detail: { month, year } }))} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
            Add Task
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
          {legend}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} style={{ textAlign: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)', paddingBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{day}</div>
        ))}
        
        {blanks}
        
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayOfWeekIndex = (startingIndex + i) % 7;
          const isWeekend = dayOfWeekIndex === 5 || dayOfWeekIndex === 6;
          // Today is purely for demo purposes locked to Aug 5, 2026. Alternatively use new Date()
          const isToday = day === 5 && month === 7 && year === 2026;
          return renderDay(day, isWeekend, isToday, month, year);
        })}
      </div>
    </div>
  );
};

export default function TimeAbsenceView({ role, user }: { role: string, user?: any }) {
  const { showToast } = useToast();
  const [clockedIn, setClockedIn] = useState(false);
  const [shiftCompleted, setShiftCompleted] = useState(false);
  const [clockTime, setClockTime] = useState<string | null>(null);
  const [clockLoading, setClockLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [customEvents, setCustomEvents] = useState<Array<{ day: number, month: number, year: number, title: string, type: string }>>([]);
  const [selectedDay, setSelectedDay] = useState<{ day: number, month: number, year: number } | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  useEffect(() => {
    const handleOpenModal = (e: any) => {
      setSelectedDay({ day: new Date().getDate(), month: e.detail.month, year: e.detail.year });
      setShowEventModal(true);
    };
    document.addEventListener('openAddTaskModal', handleOpenModal);
    return () => document.removeEventListener('openAddTaskModal', handleOpenModal);
  }, []);

  useEffect(() => {
    if (role === 'Standard Employee') {
      const fetchTodayAttendance = async () => {
        try {
          const res = await apiClient.get('/attendance/today');
          const record = res.data?.data;
          if (record) {
            const events = record.attendanceEvents || [];
            const clockInEvent = events.find((e: any) => e.eventType === 'CLOCK_IN');
            const hasClockOut = events.some((e: any) => e.eventType === 'CLOCK_OUT');
            
            if (clockInEvent && !hasClockOut) {
              setClockedIn(true);
              setClockTime(new Date(clockInEvent.originalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            } else if (hasClockOut) {
              setClockedIn(false);
              setShiftCompleted(true);
              setClockTime(null);
            }
          }
        } catch(e) {
          console.error("Failed to fetch today attendance", e);
        }
      };
      fetchTodayAttendance();
    }
  }, [role]);

  const handleClockToggle = async () => {
    setClockLoading(true);
    try {
      const payload = {
        gpsData: { lat: 0, lng: 0, gpsAccuracyMeters: 10 },
        deviceData: { browser: navigator.userAgent, platform: navigator.platform }
      };
      
      if (!clockedIn) {
        await apiClient.post('/attendance/clock-in', payload);
        const now = new Date();
        setClockTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setClockedIn(true);
      } else {
        await apiClient.post('/attendance/clock-out', payload);
        setClockTime(null);
        setClockedIn(false);
        setShiftCompleted(true);
      }
    } catch(err) {
      console.error(err);
      alert('Failed to update attendance status');
    } finally {
      setClockLoading(false);
    }
  };

  const [leaveBalances, setLeaveBalances] = useState({ casual: 8, sick: 5, earned: 15 });

  useEffect(() => {
    if (role === 'Standard Employee') {
      const fetchBalances = async () => {
        try {
          const res = await apiClient.get('/leave/balances');
          if (res.data?.data?.balances) {
            const balances = res.data.data.balances;
            let casual = 0, sick = 0, earned = 0;
            balances.forEach((b: any) => {
              const name = b.policyId?.name?.toLowerCase() || '';
              if (name.includes('casual')) casual += b.balance;
              else if (name.includes('sick')) sick += b.balance;
              else earned += b.balance;
            });
            setLeaveBalances({ casual: casual || 8, sick: sick || 5, earned: earned || 15 });
          }
        } catch(e) {
          console.error("Failed to fetch leave balances", e);
        }
      };
      
      const fetchHistory = async () => {
        try {
          const res = await apiClient.get('/leave/requests/me');
          if (res.data?.data) {
            setEmployeeHistory(res.data.data);
          }
        } catch (e) {
          console.error("Failed to fetch history", e);
        }
      };
      
      fetchBalances();
      fetchHistory();
    }
  }, [role, refreshTrigger]);

  const [employeeHistory, setEmployeeHistory] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  
  useEffect(() => {
    if (role === 'HR Manager') {
      const fetchLeaves = async () => {
        try {
          const res = await apiClient.get('/leave/requests?status=PENDING');
          if (res.data?.data?.items) {
             const mapped = res.data.data.items.map((r: any) => ({
                id: r._id,
                employee: r.employeeId?.firstName ? `${r.employeeId.firstName} ${r.employeeId.lastName}` : 'Employee',
                type: r.leavePolicyId?.name || 'Leave Request',
                dates: `${new Date(r.startDate).toLocaleDateString()} - ${new Date(r.endDate).toLocaleDateString()}`,
                days: r.durationInDays || r.totalDays || 1,
                status: r.status,
                conflict: null
             }));
             setLeaveRequests(mapped);
          } else {
             setLeaveRequests([]);
          }
        } catch(e) {
          console.error("Failed to fetch leaves", e);
          setLeaveRequests([]);
        }
      };

      const fetchAnomalies = async () => {
        try {
          const res = await apiClient.get('/attendance/anomalies');
          if (res.data?.data) {
             setAnomalies(Array.isArray(res.data.data) ? res.data.data : res.data.data.items || []);
          } else {
             setAnomalies([]);
          }
        } catch (e) {
          console.error("Failed to fetch anomalies", e);
          setAnomalies([]);
        }
      };

      fetchLeaves();
      fetchAnomalies();
    }
  }, [role, refreshTrigger]);

  const handleApprove = async (id: string) => {
    try {
      await apiClient.post(`/leave/requests/${id}/approve`);
      setRefreshTrigger(prev => prev + 1);
    } catch(e) { console.error(e); alert('Failed to approve'); }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter rejection reason:");
    if (reason === null) return;
    try {
      await apiClient.post(`/leave/requests/${id}/reject`, { rejectionReason: reason || 'Not provided' });
      setRefreshTrigger(prev => prev + 1);
    } catch(e) { console.error(e); alert('Failed to reject'); }
  };

  // View: Standard Employee (Self-Service)
  if (role === 'Standard Employee') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>Time & Absence</h2>
          <p className="text-secondary" style={{ fontSize: '14px' }}>Manage your daily attendance and leave balances.</p>
        </div>

        <div className="grid-12">
          {/* Clock In Widget */}
          <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
            <div style={{ position: 'relative', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: clockedIn ? '4px solid var(--color-blob-1)' : '4px solid rgba(0,0,0,0.1)', transition: 'all 0.3s ease' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '40px', color: clockedIn ? 'var(--color-blob-1)' : 'var(--color-text-secondary)', marginBottom: '8px' }}>
                {clockedIn ? 'timer' : 'timer_off'}
              </span>
              <span style={{ fontSize: '18px', fontWeight: 600 }}>{clockedIn ? clockTime : '--:--'}</span>
            </div>
            
            <div className="glass-cutout" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#10b981' }}>my_location</span>
              Geo-fence: Office HQ (Verified)
            </div>

            <button 
              className="btn btn-primary" 
              onClick={handleClockToggle}
              disabled={clockLoading || shiftCompleted}
              style={{ width: '100%', padding: '12px', background: shiftCompleted ? 'var(--color-glass-surface)' : clockedIn ? '#ef4444' : 'var(--color-accent)', color: shiftCompleted ? 'var(--color-text-secondary)' : '#fff', border: 'none', opacity: (clockLoading || shiftCompleted) ? 0.7 : 1 }}
            >
              {clockLoading ? 'Processing...' : shiftCompleted ? 'Shift Completed' : (clockedIn ? 'Clock Out' : 'Clock In')}
            </button>
          </div>

          {/* Leave Balances */}
          <div className="glass-panel" style={{ gridColumn: 'span 8', padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px' }}>Leave Balances (2026)</h3>
              <button onClick={() => setShowLeaveModal(true)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>Request Leave</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div className="glass-cutout" style={{ padding: '20px', textAlign: 'center', borderTop: '3px solid var(--color-blob-1)' }}>
                <p style={{ fontSize: '32px', fontWeight: 300, marginBottom: '4px' }}>{leaveBalances.casual < 10 ? `0${leaveBalances.casual}` : leaveBalances.casual}</p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Casual Leaves</p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>Available Balance</p>
              </div>
              <div className="glass-cutout" style={{ padding: '20px', textAlign: 'center', borderTop: '3px solid var(--color-blob-2)' }}>
                <p style={{ fontSize: '32px', fontWeight: 300, marginBottom: '4px' }}>{leaveBalances.sick < 10 ? `0${leaveBalances.sick}` : leaveBalances.sick}</p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Sick Leaves</p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>Available Balance</p>
              </div>
              <div className="glass-cutout" style={{ padding: '20px', textAlign: 'center', borderTop: '3px solid var(--color-blob-3)' }}>
                <p style={{ fontSize: '32px', fontWeight: 300, marginBottom: '4px' }}>{leaveBalances.earned < 10 ? `0${leaveBalances.earned}` : leaveBalances.earned}</p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Earned Leaves</p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>Accrued Monthly</p>
              </div>
            </div>
            
            <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>Recent History</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {employeeHistory.length === 0 ? (
                  <div style={{ padding: '12px', background: 'rgba(0,0,0,0.02)', fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>No recent leave requests.</div>
                ) : (
                  employeeHistory.slice(0, 3).map(req => {
                    const statusColor = req.status === 'APPROVED' ? '#10b981' : req.status === 'REJECTED' ? '#ef4444' : req.status === 'CANCELLED' ? '#6b7280' : '#f59e0b';
                    return (
                      <div key={req._id} style={{ padding: '12px', borderLeft: `3px solid ${statusColor}`, background: 'rgba(0,0,0,0.02)', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: 600 }}>{req.leavePolicyId?.name || req.leaveCode}</span>
                          <span style={{ fontSize: '11px', color: statusColor, fontWeight: 600 }}>{req.status}</span>
                        </div>
                        <span className="text-secondary">{new Date(req.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} - {new Date(req.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Work Calendar */}
          <MonthCalendar 
            legend={
              <>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-blob-1)' }}></div> Office Shift</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-blob-2)' }}></div> Remote Shift</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-blob-3)' }}></div> Approved Leave</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eab308' }}></div> Custom Task</span>
              </>
            }
            renderDay={(day, isWeekend, isToday, month, year) => {
              let type = 'none';
              // Only apply demo data for Aug 2026
              if (month === 7 && year === 2026) {
                if ([12, 13, 14].includes(day)) type = 'leave';
                else if ([6, 20].includes(day)) type = 'remote';
                else if (!isWeekend) type = 'office';
              } else {
                if (!isWeekend) type = 'office'; // Default all other months to office shift on weekdays
              }
              
              // Event matching requires month and year checking too
              // For simplicity of custom events we'll attach month/year to them in the next step, 
              // but for now let's just show events matching the day.
              const dayEvents = customEvents.filter(e => e.day === day && e.month === month && e.year === year);
              
              return (
                <div key={day} className="glass-cutout interactive" onClick={() => { setSelectedDay({ day, month, year }); setShowEventModal(true); }} style={{ 
                  padding: '12px', minHeight: '100px', display: 'flex', flexDirection: 'column',
                  border: isToday ? '2px solid var(--color-blob-1)' : '1px solid var(--cutout-border)',
                  background: type === 'leave' ? 'rgba(2, 132, 199, 0.1)' : isWeekend ? 'rgba(0,0,0,0.05)' : 'var(--cutout-bg)',
                  opacity: isWeekend ? 0.7 : 1, cursor: 'pointer'
                }}>
                  <span style={{ fontSize: '15px', fontWeight: isToday ? 800 : 600, color: isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)', marginBottom: '8px' }}>{day}</span>
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {type === 'office' && <div style={{ padding: '4px 8px', background: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8', fontSize: '11px', fontWeight: 600, borderRadius: '4px', textAlign: 'center' }}>09:00 - 17:00</div>}
                    {type === 'remote' && <div style={{ padding: '4px 8px', background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa', fontSize: '11px', fontWeight: 600, borderRadius: '4px', textAlign: 'center' }}>WFH</div>}
                    {type === 'leave' && <div style={{ padding: '4px 8px', background: 'rgba(2, 132, 199, 0.4)', color: '#fff', fontSize: '11px', fontWeight: 600, borderRadius: '4px', textAlign: 'center' }}>Casual Leave</div>}
                    {dayEvents.map((evt, idx) => (
                      <div key={idx} style={{ padding: '4px 8px', background: evt.type === 'Task' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.2)', color: evt.type === 'Task' ? '#eab308' : '#22c55e', fontSize: '11px', fontWeight: 600, borderRadius: '4px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {evt.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }}
          />
        </div>
        {showEventModal && selectedDay !== null && (
          <CustomEventModal 
            day={selectedDay.day} 
            onClose={() => { setShowEventModal(false); setSelectedDay(null); }} 
            onSave={(evt) => setCustomEvents(prev => [...prev, { ...evt, month: selectedDay.month, year: selectedDay.year }])} 
          />
        )}
        {showLeaveModal && (
          <RequestLeaveModal 
            onClose={() => setShowLeaveModal(false)} 
            onSuccess={() => { setShowLeaveModal(false); setRefreshTrigger(prev => prev + 1); }} 
          />
        )}
      </div>
    );
  }

  // View: HR Manager (Approvals & Oversight)
  if (role === 'HR Manager') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>Time & Absence Oversight</h2>
            <p className="text-secondary" style={{ fontSize: '14px' }}>Module M-05 & M-06: Approvals and Anomalies</p>
          </div>
        </div>

        <div className="grid-12">
          {/* Pending Approvals */}
          <div className="glass-panel" style={{ gridColumn: 'span 8', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px' }}>Pending Leave Approvals</h3>
              <span style={{ background: 'var(--color-blob-1)', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{leaveRequests.length} Requests</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {leaveRequests.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No pending leave requests.</div>
              )}
              {leaveRequests.map(req => (
                <div key={req.id} className="glass-cutout" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{req.employee}</h4>
                      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                        <span style={{ fontWeight: 500, color: 'var(--color-ui-element)' }}>{req.type}</span> • {req.dates} ({req.days} days)
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleApprove(req.id)} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>Approve</button>
                      <button onClick={() => handleReject(req.id)} className="btn btn-glass" style={{ padding: '6px 12px', fontSize: '12px', color: '#ef4444' }}>Reject</button>
                    </div>
                  </div>
                  {req.conflict && (
                    <div style={{ padding: '8px 12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '6px', fontSize: '12px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>warning</span>
                      Conflict: {req.conflict}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Attendance Anomalies */}
          <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px' }}>Attendance Flags</h3>
              <span className="material-symbols-outlined" style={{ color: '#ef4444' }}>flag</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {anomalies.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No anomalies detected.</div>
              )}
              {anomalies.map(anomaly => (
                <div key={anomaly.id} style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#ef4444', marginBottom: '4px' }}>{anomaly.issue}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    <span>{anomaly.employee}</span>
                    <span>{anomaly.date}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
               <div style={{ padding: '16px', background: 'var(--color-glass-surface)', borderRadius: '12px', textAlign: 'center' }}>
                 <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Workforce Status</p>
                 <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
                   <div><span style={{ fontSize: '24px', fontWeight: 600 }}>312</span><p style={{ fontSize: '11px' }}>Clocked In</p></div>
                   <div><span style={{ fontSize: '24px', fontWeight: 600 }}>24</span><p style={{ fontSize: '11px' }}>Absent</p></div>
                 </div>
               </div>
            </div>
          </div>

          {/* Team Absence Calendar */}
          <MonthCalendar 
            titlePrefix="Team Absence Calendar"
            legend={
              <>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-blob-2)' }}></div> Low Impact (1-2 away)</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></div> Medium (3-5 away)</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></div> High Risk (6+ away)</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eab308' }}></div> Custom Task</span>
              </>
            }
            renderDay={(day, isWeekend, isToday, month, year) => {
              let absenceCount = isWeekend ? 0 : (day * (month + 1)) % 4;
              if (month === 7 && year === 2026) {
                if (day === 12 || day === 14) absenceCount = 4;
                if (day === 21) absenceCount = 7; // Critical day
              }
              
              const level = absenceCount >= 6 ? 'high' : absenceCount >= 3 ? 'medium' : absenceCount > 0 ? 'low' : 'none';
              const bg = level === 'high' ? 'rgba(239, 68, 68, 0.15)' : level === 'medium' ? 'rgba(245, 158, 11, 0.15)' : level === 'low' ? 'rgba(167, 139, 250, 0.15)' : 'var(--color-glass-surface)';
              const border = level === 'high' ? '1px solid rgba(239, 68, 68, 0.3)' : level === 'medium' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--cutout-border)';
              const text = level === 'high' ? '#ef4444' : level === 'medium' ? '#f59e0b' : level === 'low' ? '#a78bfa' : 'var(--color-text-secondary)';
              
              const dayEvents = customEvents.filter(e => e.day === day && e.month === month && e.year === year);
              
              return (
                <div key={day} className="glass-cutout interactive" onClick={() => { setSelectedDay({ day, month, year }); setShowEventModal(true); }} style={{ 
                  padding: '12px', minHeight: '90px', display: 'flex', flexDirection: 'column',
                  border: isToday ? '2px solid var(--color-blob-1)' : border,
                  background: isWeekend ? 'rgba(0,0,0,0.05)' : bg,
                  opacity: isWeekend ? 0.7 : 1, cursor: 'pointer'
                }}>
                  <span style={{ fontSize: '15px', fontWeight: isToday ? 800 : 600, color: isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)', marginBottom: '8px' }}>{day}</span>
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {!isWeekend && absenceCount > 0 && (
                      <div style={{ padding: '4px 8px', background: bg, color: text, fontSize: '12px', fontWeight: 700, borderRadius: '4px', textAlign: 'center', border }}>
                        {absenceCount} Away
                      </div>
                    )}
                    {dayEvents.map((evt, idx) => (
                      <div key={idx} style={{ padding: '4px 8px', background: evt.type === 'Task' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.2)', color: evt.type === 'Task' ? '#eab308' : '#22c55e', fontSize: '11px', fontWeight: 600, borderRadius: '4px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {evt.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }}
          />
        </div>
        {showEventModal && selectedDay !== null && (
          <CustomEventModal 
            day={selectedDay.day} 
            onClose={() => { setShowEventModal(false); setSelectedDay(null); }} 
            onSave={(evt) => setCustomEvents(prev => [...prev, { ...evt, month: selectedDay.month, year: selectedDay.year }])} 
          />
        )}
      </div>
    );
  }

  // View: Finance Executive (Financial Liability)
  if (role === 'Finance Executive') {
    const handleExportReport = () => {
      const csvContent = "data:text/csv;charset=utf-8," 
        + "Department,Liability Type,Amount (USD),Headcount\n"
        + "Engineering,PTO Accrual,45000,120\n"
        + "Sales,Encashment,25000,80\n"
        + "Operations,Overtime,18400,200\n"
        + "Marketing,PTO Accrual,12000,45\n";

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "liability_report_Q3.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>Absence & Overtime Liability</h2>
            <p className="text-secondary" style={{ fontSize: '14px' }}>Financial projections for accrued leaves and overtime payouts.</p>
          </div>
          <button onClick={handleExportReport} className="btn btn-glass" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
            Export Report
          </button>
        </div>

        <div className="grid-12">
          <div className="glass-panel interactive" style={{ gridColumn: 'span 4', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Total Leave Liability</h3>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-blob-1)', fontSize: '20px' }}>account_balance</span>
            </div>
            <p style={{ fontSize: '36px', fontWeight: 300, letterSpacing: '-1px' }}>$142.5K</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
              <span style={{ fontSize: '12px', padding: '4px 8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '4px', fontWeight: 600 }}>-4.2%</span>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>vs last quarter</p>
            </div>
          </div>
          <div className="glass-panel interactive" style={{ gridColumn: 'span 4', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Projected Encashment</h3>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-blob-2)', fontSize: '20px' }}>payments</span>
            </div>
            <p style={{ fontSize: '36px', fontWeight: 300, letterSpacing: '-1px' }}>$35.2K</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
              <span style={{ fontSize: '12px', padding: '4px 8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '4px', fontWeight: 600 }}>+12.5%</span>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>vs last quarter</p>
            </div>
          </div>
          <div className="glass-panel interactive" style={{ gridColumn: 'span 4', padding: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0) 70%)', borderRadius: '50%' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', position: 'relative', zIndex: 1 }}>
              <h3 style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Current Month Overtime</h3>
              <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: '20px' }}>warning</span>
            </div>
            <p style={{ fontSize: '36px', fontWeight: 300, letterSpacing: '-1px', color: '#ef4444', position: 'relative', zIndex: 1 }}>$18.4K</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', position: 'relative', zIndex: 1 }}>
              <span style={{ fontSize: '12px', padding: '4px 8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '4px', fontWeight: 600 }}>420 hrs</span>
              <p style={{ fontSize: '12px', color: '#ef4444', opacity: 0.8 }}>+15% YoY</p>
            </div>
          </div>
          
          {/* Financial Liability Calendar */}
          <MonthCalendar 
            titlePrefix="Liability & Encashment Schedule"
            legend={
              <>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></div> Overtime Disbursal</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></div> Encashment Deadline</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eab308' }}></div> Custom Task</span>
              </>
            }
            renderDay={(day, isWeekend, isToday, month, year) => {
              let type = 'none';
              // Just use some fixed days of month regardless of which month it is for demo
              if (day === 15) type = 'overtime';
              if (day === 30 && month !== 1) type = 'encashment'; // Feb doesn't have 30
              
              const bg = type === 'overtime' ? 'rgba(245, 158, 11, 0.1)' : type === 'encashment' ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-glass-surface)';
              
              const dayEvents = customEvents.filter(e => e.day === day && e.month === month && e.year === year);
              
              return (
                <div key={day} className="glass-cutout interactive" onClick={() => { setSelectedDay({ day, month, year }); setShowEventModal(true); }} style={{ 
                  padding: '12px', minHeight: '90px', display: 'flex', flexDirection: 'column',
                  border: isToday ? '2px solid var(--color-blob-1)' : '1px solid var(--cutout-bg)',
                  background: isWeekend ? 'rgba(0,0,0,0.05)' : bg,
                  opacity: isWeekend ? 0.7 : 1, cursor: 'pointer'
                }}>
                  <span style={{ fontSize: '15px', fontWeight: isToday ? 800 : 600, color: isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)', marginBottom: '8px' }}>{day}</span>
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {type === 'overtime' && <div style={{ padding: '4px', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', fontSize: '11px', fontWeight: 600, borderRadius: '4px', textAlign: 'center' }}>$12.5k OT</div>}
                    {type === 'encashment' && <div style={{ padding: '4px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '11px', fontWeight: 600, borderRadius: '4px', textAlign: 'center' }}>$35.2k Encash</div>}
                    {dayEvents.map((evt, idx) => (
                      <div key={idx} style={{ padding: '4px 8px', background: evt.type === 'Task' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.2)', color: evt.type === 'Task' ? '#eab308' : '#22c55e', fontSize: '11px', fontWeight: 600, borderRadius: '4px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {evt.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }}
          />
        </div>
        {showEventModal && selectedDay !== null && (
          <CustomEventModal 
            day={selectedDay.day} 
            onClose={() => { setShowEventModal(false); setSelectedDay(null); }} 
            onSave={(evt) => setCustomEvents(prev => [...prev, { ...evt, month: selectedDay.month, year: selectedDay.year }])} 
          />
        )}
      </div>
    );
  }

  // View: Administrator (IT Access Anomalies)
  if (role === 'Administrator') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>Access & Attendance Security</h2>
          <p className="text-secondary" style={{ fontSize: '14px' }}>Cross-referencing physical clock-ins with logical VPN/Network access.</p>
        </div>

        <div className="grid-12">
          <div className="glass-panel" style={{ gridColumn: 'span 12', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px' }}>Detected Anomalies (M-11 Integration)</h3>
              <span style={{ padding: '4px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>2 CRITICAL</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '16px', background: 'var(--color-glass-surface)', borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ fontSize: '15px', fontWeight: 600 }}>VPN Login without Clock-In</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>10 mins ago</p>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>User `emp_405` authenticated via VPN from IP 192.168.1.45, but has not clocked into the HR system today.</p>
                <button onClick={() => showToast('Feature in Development', 'info', 'This feature is currently in development.')} className="btn btn-glass" style={{ padding: '6px 12px', fontSize: '12px', marginTop: '12px', color: '#ef4444' }}>Force Disconnect</button>
              </div>

              <div style={{ padding: '16px', background: 'var(--color-glass-surface)', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ fontSize: '15px', fontWeight: 600 }}>Physical/Logical Location Mismatch</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>1 hour ago</p>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>User `emp_102` clocked in via Geo-fence (New York HQ), but logical access originates from EMEA Region.</p>
              </div>
            </div>
          </div>

          {/* Access Security Timeline (Calendar View) */}
          <MonthCalendar 
            titlePrefix="Access Security Events"
            legend={
              <>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></div> Logical Mismatch</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></div> Ghost Login (VPN w/o Clock-in)</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eab308' }}></div> Custom Task</span>
              </>
            }
            renderDay={(day, isWeekend, isToday, month, year) => {
              let anomalies = 0;
              let hasCritical = false;
              if (month === 7 && year === 2026) {
                if (day === 5) { anomalies = 2; hasCritical = true; }
                if (day === 12) { anomalies = 1; }
              }
              
              const dayEvents = customEvents.filter(e => e.day === day && e.month === month && e.year === year);
              
              return (
                <div key={day} className="glass-cutout interactive" onClick={() => { setSelectedDay({ day, month, year }); setShowEventModal(true); }} style={{ 
                  padding: '12px', minHeight: '90px', display: 'flex', flexDirection: 'column',
                  border: isToday ? '2px solid var(--color-blob-1)' : hasCritical ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--cutout-bg)',
                  background: isWeekend ? 'rgba(0,0,0,0.05)' : anomalies > 0 ? 'rgba(239, 68, 68, 0.05)' : 'var(--color-glass-surface)',
                  opacity: isWeekend ? 0.7 : 1, cursor: 'pointer'
                }}>
                  <span style={{ fontSize: '15px', fontWeight: isToday ? 800 : 600, color: isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)', marginBottom: '8px' }}>{day}</span>
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {anomalies > 0 && (
                      <div style={{ padding: '4px', background: hasCritical ? '#ef4444' : '#f59e0b', color: '#fff', fontSize: '11px', fontWeight: 600, borderRadius: '4px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>warning</span> {anomalies} Events
                      </div>
                    )}
                    {dayEvents.map((evt, idx) => (
                      <div key={idx} style={{ padding: '4px 8px', background: evt.type === 'Task' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.2)', color: evt.type === 'Task' ? '#eab308' : '#22c55e', fontSize: '11px', fontWeight: 600, borderRadius: '4px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {evt.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }}
          />
        </div>
        {showEventModal && selectedDay !== null && (
          <CustomEventModal 
            day={selectedDay.day} 
            onClose={() => { setShowEventModal(false); setSelectedDay(null); }} 
            onSave={(evt) => setCustomEvents(prev => [...prev, { ...evt, month: selectedDay.month, year: selectedDay.year }])} 
          />
        )}
      </div>
    );
  }

  // Fallback for any other roles (Super Admin)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>shield</span>
        <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--color-ui-element)' }}>System Administration</h2>
        <p style={{ maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>Time and absence metrics are managed at the departmental and organizational levels. To view operational timesheets and leave requests, please access the platform using an HR, Finance, or Administrative role.</p>
      </div>
    </div>
  );
}
