import { useState, useEffect } from 'react';
import { useToast } from './ToastProvider';

interface OrgChartViewProps {
  role: string;
  user?: any;
}

const OrgChartView: React.FC<OrgChartViewProps> = ({ role, user }) => {
  const { showToast } = useToast();
  const [departments, setDepartments] = useState<any[]>([
    { id: 'DEP-01', name: 'Engineering', head: 'Sarah Jenkins', headTitle: 'VP of Engineering', headcount: 45, maxCapacity: 50, budget: 8500000, runRate: 7900000, risk: 'Low', hardwareCount: 120, licenses: ['GitHub Enterprise', 'AWS', 'Jira'] }
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [ecosystem, setEcosystem] = useState<{ manager: any, peers: any[] }>({ manager: null, peers: [] });
  const [isLoadingEcosystem, setIsLoadingEcosystem] = useState(true);

  useEffect(() => {
    const fetchEcosystem = async () => {
      try {
        setIsLoadingEcosystem(true);
        const { apiClient } = await import('../api/client');
        const res = await apiClient.get('/employees');
        if (res.data?.data) {
          const allEmployees = res.data.data.employees || res.data.data;
          const empList = Array.isArray(allEmployees) ? allEmployees : [];
          
          const myManagerId = user?.managerId;
          const manager = empList.find((e: any) => e._id === myManagerId) || null;
          
          // Peers are employees sharing the same manager, excluding the user themselves
          const peers = empList.filter((e: any) => e.managerId === myManagerId && e._id !== user?._id);
          
          setEcosystem({ manager, peers });
        }
      } catch (err) {
        console.error('Failed to fetch ecosystem:', err);
      } finally {
        setIsLoadingEcosystem(false);
      }
    };
    if (user && role === 'Standard Employee') {
      fetchEcosystem();
    }
  }, [user, role]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setIsLoading(true);
        const { apiClient } = await import('../api/client');
        const res = await apiClient.get('/departments');
        if (res.data?.data) {
          const mapped = res.data.data.map((d: any) => ({
            id: d.departmentCode || d._id.substring(0, 8).toUpperCase(),
            name: d.name,
            head: d.manager?.firstName ? `${d.manager.firstName} ${d.manager.lastName}` : 'Unassigned',
            headTitle: d.manager?.designation?.name || 'Department Manager',
            headcount: d.cachedEmployeeCount || 0,
            maxCapacity: Math.floor(Math.max((d.cachedEmployeeCount || 10) * 1.5, 20)),
            budget: Math.floor(1000000 + Math.random() * 5000000),
            runRate: Math.floor(900000 + Math.random() * 5000000),
            risk: Math.random() > 0.8 ? 'High' : Math.random() > 0.5 ? 'Medium' : 'Low',
            hardwareCount: (d.cachedEmployeeCount || 10) * 2,
            licenses: ['Enterprise Default']
          }));
          setDepartments(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDepartments();
  }, []);

  const [activeDrawerDept, setActiveDrawerDept] = useState<string | null>(null);

  // --- 1. Standard Employee: "My Ecosystem" (Node Map) ---
  const renderEmployeeView = () => (
    <div style={{ position: 'relative', minHeight: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
      
      {/* Background blobs (Managed by global layout now, but we keep some local flavor if needed) */}
      <div style={{ position: 'absolute', top: '10%', left: '20%', width: '300px', height: '300px', background: 'var(--color-blob-1)', filter: 'blur(80px)', borderRadius: '50%', opacity: 0.2, zIndex: 0 }}></div>
      <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: '400px', height: '400px', background: 'var(--color-blob-2)', filter: 'blur(100px)', borderRadius: '50%', opacity: 0.15, zIndex: 0 }}></div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '900px', zIndex: 2 }}>
        
        {/* Manager Node (Level 1) */}
        {ecosystem.manager ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 20 }}>
            <div className="text-metadata" style={{ marginBottom: '8px', opacity: 0.8 }}>Reporting To</div>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', width: '340px', transition: 'transform 0.3s, box-shadow 0.3s', cursor: 'pointer' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#111111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', flexShrink: 0, border: '2px solid var(--cutout-bg)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}>
                {ecosystem.manager.firstName?.[0]}{ecosystem.manager.lastName?.[0]}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-ui-element)', lineHeight: 1.2 }}>{ecosystem.manager.firstName} {ecosystem.manager.lastName}</span>
                <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{ecosystem.manager.designation?.name || 'Manager'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 20 }}>
            <div className="text-metadata" style={{ marginBottom: '8px', opacity: 0.8 }}>Reporting To</div>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', width: '340px', transition: 'transform 0.3s, box-shadow 0.3s', cursor: 'pointer', opacity: 0.7 }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--cutout-bg)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', flexShrink: 0, border: '2px dashed var(--cutout-border)' }}>?</div>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-ui-element)', lineHeight: 1.2 }}>Unassigned</span>
                <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>No direct manager set</span>
              </div>
            </div>
          </div>
        )}

        {/* Vertical Connector */}
        <div style={{ width: '2px', height: '80px', background: 'rgba(0, 0, 0, 0.1)', position: 'relative', marginTop: '-4px', marginBottom: '-4px', zIndex: 10 }}>
           <div style={{ position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)', width: '6px', height: '6px', background: 'var(--color-accent)', borderRadius: '50%', boxShadow: '0 0 10px var(--color-accent)', animation: 'travelDown 3s infinite cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
        </div>

        <style>{`
          @keyframes travelDown {
            0% { top: 0; opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
          @keyframes pulseGlow {
            0% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.15), 0 30px 60px -15px rgba(0, 0, 0, 0.05); }
            100% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.3), 0 30px 60px -15px rgba(0, 0, 0, 0.05); }
          }
          .node-hover:hover {
            transform: translateY(-4px);
            box-shadow: 0 40px 40px rgba(0, 0, 0, 0.08);
          }
        `}</style>

        {/* Central Employee Node (YOU - Level 2) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 20 }}>
          <div className="glass-panel" style={{ position: 'relative', padding: '32px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '420px', animation: 'pulseGlow 4s infinite alternate', border: '1px solid rgba(16,185,129,0.3)' }}>
            
            {/* YOU Badge */}
            <div className="text-metadata" style={{ position: 'absolute', top: '-12px', background: 'linear-gradient(to right, #38bdf8, #8b5cf6)', color: '#fff', padding: '4px 12px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(139,92,246,0.3)', zIndex: 30, letterSpacing: '0.15em' }}>YOU</div>
            
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '4px solid var(--glass-border-light)', background: 'linear-gradient(135deg, #10B981, #3b82f6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', margin: '0 auto 16px auto', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', flexShrink: 0 }}>
              {user ? user.firstName?.[0] : 'A'}{user ? user.lastName?.[0] : 'J'}
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-ui-element)', margin: '0 0 4px 0', lineHeight: 1.2 }}>{user ? `${user.firstName} ${user.lastName}` : 'Alex Johnson'}</h2>
              <span style={{ fontSize: '15px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{user?.designation?.name || user?.roles?.[0] || 'Employee'}</span>
            </div>

            {/* Quick Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', width: '100%' }}>
              <div className="glass-cutout" style={{ padding: '12px 8px', textAlign: 'center' }}>
                <div className="text-metadata" style={{ fontSize: '10px', marginBottom: '4px' }}>PROJECTS</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-ui-element)' }}>12</div>
              </div>
              <div className="glass-cutout" style={{ padding: '12px 8px', textAlign: 'center' }}>
                <div className="text-metadata" style={{ fontSize: '10px', marginBottom: '4px' }}>IMPACT</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-ui-element)' }}>High</div>
              </div>
              <div className="glass-cutout" style={{ padding: '12px 8px', textAlign: 'center' }}>
                <div className="text-metadata" style={{ fontSize: '10px', marginBottom: '4px' }}>REPORTS</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-ui-element)' }}>0</div>
              </div>
            </div>

          </div>
        </div>

        {/* Vertical to Horizontal Connector */}
        <div style={{ width: '2px', height: '40px', background: 'var(--glass-border-light)', marginTop: '-4px', zIndex: 10 }}></div>
        
        {/* Horizontal Line for Peers */}
        {ecosystem.peers.length > 0 && (
          <div style={{ position: 'relative', width: `${(ecosystem.peers.length - 1) * 284}px`, height: '40px', zIndex: 10 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: 'var(--glass-border-light)' }}></div>
            {ecosystem.peers.map((peer, idx) => (
               <div key={idx} style={{ position: 'absolute', top: 0, left: `${(idx / Math.max(ecosystem.peers.length - 1, 1)) * 100}%`, transform: idx > 0 && idx < ecosystem.peers.length - 1 ? 'translateX(-50%)' : '', width: '2px', height: '100%', background: 'var(--glass-border-light)' }}></div>
            ))}
          </div>
        )}

        {/* Peers Container (Level 3) */}
        {ecosystem.peers.length > 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', position: 'relative', zIndex: 20 }}>
            {ecosystem.peers.map((peer, idx) => (
              <div key={peer._id || idx} className="glass-panel node-hover" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', width: '260px', opacity: 0.9, transform: 'scale(0.95)', transformOrigin: 'top', transition: 'all 0.3s ease' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', color: 'var(--color-ui-element)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', flexShrink: 0 }}>
                  {peer.firstName?.[0]}{peer.lastName?.[0]}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', overflow: 'hidden' }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ui-element)', lineHeight: 1.2, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{peer.firstName} {peer.lastName}</span>
                  <span className="text-metadata" style={{ fontSize: '10px', marginTop: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{peer.designation?.name || 'Employee'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '24px', opacity: 0.5, fontStyle: 'italic', fontSize: '14px' }}>No peers in this ecosystem</div>
        )}
      </div>
    </div>
  );

  // --- 2. HR Manager: "Company DNA & Talent Tree" ---
  const renderHRManagerView = () => (
    <div style={{ padding: '20px 0', overflowX: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '1000px', margin: '0 auto' }}>
        
        {/* Executive Board Root */}
        <div className="glass-panel" style={{ padding: '20px 60px', textAlign: 'center', zIndex: 2, marginBottom: 0 }}>
           <h2 style={{ margin: '0 0 4px 0', fontSize: '24px' }}>Executive Board</h2>
           <p style={{ margin: 0, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '12px' }}>CEO & C-Suite</p>
        </div>

        {/* Root Vertical Line */}
        <div style={{ width: '2px', height: '40px', background: 'var(--glass-border-light)' }}></div>

        {/* Departments Level */}
        <div style={{ display: 'flex', width: '100%' }}>
          {isLoading ? (
             <div style={{ padding: '60px', width: '100%', textAlign: 'center' }}>Loading Organizational Structure...</div>
          ) : departments.map((dept, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === departments.length - 1;
            const fillPercentage = (dept.headcount / dept.maxCapacity) * 100;
            
            return (
              <div key={dept.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                
                {/* Mathematical Tree Connectors (Flawless CSS Grid) */}
                <div style={{ display: 'flex', width: '100%' }}>
                  <div style={{ flex: 1, height: '40px', borderTop: isFirst ? '0' : '2px solid var(--glass-border-light)', borderRight: '1px solid var(--glass-border-light)' }}></div>
                  <div style={{ flex: 1, height: '40px', borderTop: isLast ? '0' : '2px solid var(--glass-border-light)', borderLeft: '1px solid var(--glass-border-light)' }}></div>
                </div>

                {/* Department Card Container */}
                <div style={{ width: '100%', padding: '0 12px' }}>
                  <div className="glass-panel" style={{ 
                     width: '100%', 
                     display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', 
                     transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)', cursor: 'pointer', borderRadius: '16px',
                     borderTop: `4px solid ${dept.risk === 'High' ? '#ef4444' : dept.risk === 'Medium' ? '#f59e0b' : '#10b981'}`,
                   }}
                   onMouseEnter={(e) => {
                     e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)';
                     e.currentTarget.style.borderColor = 'var(--color-background-base)';
                     e.currentTarget.style.boxShadow = '0 20px 48px 0 rgba(0, 0, 0, 0.1)';
                   }}
                   onMouseLeave={(e) => {
                     e.currentTarget.style.transform = 'translateY(0) scale(1)';
                     e.currentTarget.style.borderColor = '';
                     e.currentTarget.style.boxShadow = '';
                   }}
                >
                  <div style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                      <div style={{ textAlign: 'left' }}>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600 }}>{dept.name}</h3>
                        <p style={{ margin: 0, fontSize: '12px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{dept.id}</p>
                      </div>
                      <span className="material-symbols-outlined" style={{ opacity: 0.4 }}>
                        {idx === 0 ? 'code' : idx === 1 ? 'inventory_2' : idx === 2 ? 'palette' : 'trending_up'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--cutout-bg)', border: '2px solid var(--cutout-bg)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', color: 'var(--color-ui-element)', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        {dept.head.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: 'var(--color-ui-element)' }}>{dept.head}</div>
                        <div style={{ fontSize: '12px', opacity: 0.6, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{dept.headTitle}</div>
                      </div>
                    </div>

                    {/* Circular Progress & Metrics */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--cutout-bg)', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '11px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: 600 }}>Capacity</div>
                        <div style={{ fontSize: '18px', fontWeight: 800 }}>{dept.headcount} <span style={{ fontSize: '14px', opacity: 0.5, fontWeight: 500 }}>/ {dept.maxCapacity}</span></div>
                      </div>
                      
                      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
                        <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="4" />
                          <circle cx="24" cy="24" r="20" fill="none" stroke={dept.headcount >= dept.maxCapacity ? '#ef4444' : '#38bdf8'} strokeWidth="4" strokeDasharray={`${fillPercentage * 1.256} 125.6`} style={{ transition: 'stroke-dasharray 1s ease-out' }} />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: dept.risk === 'High' ? 'rgba(239, 68, 68, 0.1)' : dept.risk === 'Medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: dept.risk === 'High' ? '#b91c1c' : dept.risk === 'Medium' ? '#b45309' : '#047857' }}>
                      Attrition Risk: {dept.risk}
                    </span>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dept.risk === 'High' ? '#ef4444' : dept.risk === 'Medium' ? '#f59e0b' : '#10b981', boxShadow: `0 0 8px ${dept.risk === 'High' ? 'rgba(239,68,68,0.6)' : dept.risk === 'Medium' ? 'rgba(245,158,11,0.6)' : 'rgba(16,185,129,0.6)'}` }}></div>
                  </div>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // --- 3. IT Admin: "Infrastructure Topology Map" ---
  const renderITAdminView = () => (
    <div style={{ display: 'flex', gap: '24px', minHeight: '600px' }}>
      {/* Topology Nodes Grid */}
      <div style={{ flex: activeDrawerDept ? '2' : '1', transition: 'flex 0.5s cubic-bezier(0.4, 0, 0.2, 1)', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', alignContent: 'start' }}>
        {departments.map((dept) => {
          const isActive = activeDrawerDept === dept.id;
          return (
            <div 
              key={dept.id} 
              onClick={() => setActiveDrawerDept(isActive ? null : dept.id)}
              className="glass-panel"
              style={{ 
                padding: '24px', 
                cursor: 'pointer', 
                borderRadius: '16px',
                border: isActive ? '2px solid #38bdf8' : '',
                transform: isActive ? 'scale(1.02)' : 'scale(1)',
                background: isActive ? 'var(--glass-border-light)' : '',
                boxShadow: isActive ? '0 0 24px rgba(56, 189, 248, 0.4)' : '',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex', flexDirection: 'column', gap: '20px'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.transform = 'scale(1.01)';
                  e.currentTarget.style.background = 'var(--glass-border-light)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.background = '';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: isActive ? '#38bdf8' : 'rgba(14, 165, 233, 0.1)', color: isActive ? '#fff' : '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease', boxShadow: isActive ? '0 0 16px rgba(56,189,248,0.6)' : 'none' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>dns</span>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600 }}>{dept.name} Node</h3>
                  <p style={{ margin: 0, fontSize: '13px', opacity: 0.7, fontFamily: '"Fira Code", monospace' }}>IP: 10.0.{dept.id.replace('DEP-0', '')}.x</p>
                </div>
              </div>
              
              <div style={{ width: '100%', height: '1px', background: 'rgba(0,0,0,0.06)' }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ textAlign: 'left' }}>
                   <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.5px', marginBottom: '4px', fontWeight: 600 }}>Hardware Devices</div>
                   <div style={{ fontSize: '20px', fontWeight: 800 }}>{dept.hardwareCount}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.5px', marginBottom: '4px', fontWeight: 600 }}>SaaS Licenses</div>
                   <div style={{ fontSize: '20px', fontWeight: 800 }}>{dept.licenses.length}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sliding Drawer for IT Details */}
      {activeDrawerDept && (
        <div className="glass-panel" style={{ flex: '1', animation: 'slideInRight 0.5s cubic-bezier(0.4, 0, 0.2, 1)', height: '100%', overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column' }}>
          <style>{`
            @keyframes slideInRight {
              from { opacity: 0; transform: translateX(50px); }
              to { opacity: 1; transform: translateX(0); }
            }
          `}</style>
          
          {(() => {
            const dept = departments.find(d => d.id === activeDrawerDept)!;
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                  <div>
                    <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: 700 }}>{dept.name} Subnet</h2>
                    <p style={{ margin: 0, opacity: 0.6, fontFamily: '"Fira Code", monospace', fontSize: '13px' }}>CIDR: 10.0.{dept.id.replace('DEP-0', '')}.0/24</p>
                  </div>
                  <button onClick={() => setActiveDrawerDept(null)} style={{ background: 'var(--glass-border-light)', border: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.1)'; e.currentTarget.style.background='#fff'}} onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.background='var(--glass-border-light)'}}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                  </button>
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6, fontWeight: 700 }}>Network Health</h4>
                  <div style={{ background: 'var(--cutout-bg)', borderRadius: '16px', padding: '24px', border: '1px solid var(--glass-border-light)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    
                    {/* Bandwidth */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Bandwidth Usage</span>
                        <span style={{ fontSize: '13px', fontWeight: 700 }}>{Math.floor(Math.random() * 40 + 20)}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'var(--cutout-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.floor(Math.random() * 40 + 20)}%`, height: '100%', background: '#38bdf8', borderRadius: '3px' }}></div>
                      </div>
                    </div>
                    
                    {/* CPU Load */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>CPU Load (Avg)</span>
                        <span style={{ fontSize: '13px', fontWeight: 700 }}>{Math.floor(Math.random() * 30 + 10)}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'var(--cutout-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.floor(Math.random() * 30 + 10)}%`, height: '100%', background: '#8b5cf6', borderRadius: '3px' }}></div>
                      </div>
                    </div>
                    
                    {/* Uptime */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Uptime</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>99.99%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'var(--cutout-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: '99.99%', height: '100%', background: '#10b981', borderRadius: '3px' }}></div>
                      </div>
                    </div>

                  </div>
                </div>

                <div style={{ marginBottom: 'auto' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6, fontWeight: 700 }}>SaaS Provisioning Matrix</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {dept.licenses.map((lic: string, i: number) => (
                      <span key={i} style={{ fontSize: '12px', padding: '6px 12px', background: 'var(--cutout-border)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
                        {lic}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Terminal Block */}
                <div style={{ marginTop: '32px', background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)', color: '#4ade80', fontFamily: '"Fira Code", monospace', padding: '16px', borderRadius: '12px', fontSize: '11px', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5), 0 10px 30px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></div>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></div>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></div>
                  </div>
                  <div style={{ opacity: 0.8 }}>$ ping 10.0.{dept.id.replace('DEP-0', '')}.1</div>
                  <div style={{ opacity: 0.8 }}>64 bytes from 10.0.{dept.id.replace('DEP-0', '')}.1: icmp_seq=1 ttl=64 time=0.231 ms</div>
                  <div style={{ opacity: 0.8 }}>64 bytes from 10.0.{dept.id.replace('DEP-0', '')}.1: icmp_seq=2 ttl=64 time=0.218 ms</div>
                  <div style={{ color: '#38bdf8', marginTop: '8px', opacity: 0.9 }}>{'>'} Subnet healthy. All nodes responding.</div>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );

  // --- 4. Finance Executive: "Financial Heatmap & Cost Centers" ---
  const renderFinanceView = () => {
    const totalBudget = departments.reduce((acc, curr) => acc + curr.budget, 0);
    
    return (
      <div className="card" style={{ minHeight: '600px', display: 'flex', flexDirection: 'column', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '28px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-ui-element)' }}>account_balance</span>
              Departmental Budgets (FY24)
            </h2>
            <p style={{ margin: 0, opacity: 0.7 }}>Visual Treemap of budget allocation and run rate variance.</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px' }}>Total Org Budget</div>
            <div style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-1px' }}>${(totalBudget / 1000000).toFixed(1)}M</div>
          </div>
        </div>

        {/* Treemap/Flex Grid Simulation */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', flex: 1, alignContent: 'flex-start' }}>
          {departments.map(dept => {
            const flexBasis = `${(dept.budget / totalBudget) * 100}%`;
            const isOverBudget = dept.runRate > dept.budget;
            const variance = ((dept.runRate - dept.budget) / dept.budget) * 100;
            
            return (
              <div key={dept.id} style={{ 
                flex: `1 1 calc(${flexBasis} - 20px)`, 
                minWidth: '280px',
                minHeight: '220px',
                background: isOverBudget ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)',
                border: `1px solid ${isOverBudget ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                borderRadius: '20px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '22px' }}>{dept.name}</h3>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '8px', 
                      fontSize: '13px', 
                      fontWeight: 700,
                      background: isOverBudget ? '#fef2f2' : '#ecfdf5',
                      color: isOverBudget ? '#ef4444' : '#10b981',
                      border: `1px solid ${isOverBudget ? '#ef4444' : '#6ee7b7'}`
                    }}>
                      {isOverBudget ? '+' : ''}{variance.toFixed(1)}% Variance
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.6, marginBottom: '32px', fontFamily: 'monospace' }}>Cost Center: {dept.id.replace('DEP-', 'CC-')}</div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13px', opacity: 0.6 }}>Allocated Budget</div>
                    <div style={{ fontSize: '15px', fontWeight: 600 }}>${(dept.budget / 1000000).toFixed(2)}M</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ fontSize: '13px', opacity: 0.6 }}>Payroll Run Rate</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: isOverBudget ? '#ef4444' : 'inherit' }}>${(dept.runRate / 1000000).toFixed(2)}M</div>
                  </div>
                  
                  {/* Progress Bar for Budget vs Run Rate */}
                  <div style={{ width: '100%', height: '8px', background: 'var(--cutout-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${Math.min((dept.runRate / dept.budget) * 100, 100)}%`, 
                      height: '100%', 
                      background: isOverBudget ? '#ef4444' : '#10b981' 
                    }}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- 5. Super Admin: "Tenant Architecture & Schema" ---
  const renderSuperAdminView = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', minHeight: '600px' }}>
      <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '20px' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-ui-element)', background: 'var(--cutout-bg)', padding: '8px', borderRadius: '8px' }}>account_tree</span>
            Tenant Organization Graph
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
             <button onClick={() => showToast('Sync Complete', 'success', 'Tenant organizational graph synchronized with backend.')} className="btn btn-glass" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>sync</span> Sync</button>
          </div>
        </div>
        
        <div style={{ flex: 1, background: 'var(--cutout-bg)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--cutout-border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '16px 24px', fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>UUID Node</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Entity Map</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--cutout-border)' }}>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ fontFamily: '"Fira Code", monospace', fontSize: '13px', color: 'var(--color-ui-element)', fontWeight: 600 }}>org_root_f829</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Parent: null</div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <span style={{ padding: '4px 8px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>TENANT</span>
                     <span style={{ fontSize: '14px', fontWeight: 500 }}>Xebia</span>
                   </div>
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                  <button onClick={() => showToast('Inspection Mode', 'info', 'Detailed tenant properties loaded into memory.')} className="btn btn-glass" style={{ padding: '6px 12px', fontSize: '12px' }}>Inspect</button>
                </td>
              </tr>
              {departments.map((dept, idx) => (
                 <tr key={dept.id} style={{ borderBottom: '1px solid var(--cutout-border)', transition: 'background 0.2s' }} className="hover-bg">
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontFamily: '"Fira Code", monospace', fontSize: '13px', color: 'var(--color-ui-element)' }}>dept_node_{idx+1}0x</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Parent: org_root_f829</div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <span style={{ padding: '4px 8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>DEPT</span>
                       <span style={{ fontSize: '14px' }}>{dept.name}</span>
                     </div>
                  </td>
                  <td style={{ padding: '16px 24px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => showToast('Edit Node', 'info', 'Node editor opened.')} className="btn btn-glass" style={{ padding: '6px 12px', fontSize: '12px' }}>Edit</button>
                    <button onClick={() => showToast('Pruned', 'success', 'Tenant node successfully pruned from graph.')} className="btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '6px 12px', fontSize: '12px' }}>Prune</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 24px', background: 'var(--cutout-bg)', borderBottom: '1px solid var(--cutout-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-text-secondary)' }}>data_object</span>
             <span style={{ fontSize: '13px', fontFamily: '"Fira Code", monospace', fontWeight: 600 }}>schema.json</span>
           </div>
           <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px rgba(16,185,129,0.5)' }}></span>
        </div>
        <pre style={{ margin: 0, padding: '24px', fontSize: '13px', overflowY: 'auto', flex: 1, fontFamily: '"Fira Code", monospace', lineHeight: '1.6', color: 'var(--color-ui-element)' }}>
{JSON.stringify({
  "tenant": {
    "uuid": "tn_4912_xebia",
    "schema": "v2.1.4",
    "depth": 2,
    "nodes": departments.map((d, i) => ({
      "id": `dept_node_${i+1}0x`,
      "type": "DEPARTMENT",
      "meta": {
        "name": d.name,
        "manager_uuid": `emp_${d.head.replace(' ','').toLowerCase()}`
      }
    }))
  }
}, null, 2)}
        </pre>
      </div>
    </div>
  );

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', letterSpacing: '-1px' }}>
          {role === 'Standard Employee' ? 'My Ecosystem' : 'Organizational Architecture'}
        </h1>
        <p style={{ margin: 0, opacity: 0.7, fontSize: '16px' }}>
          {role === 'Standard Employee' && 'Visualizing your immediate team, manager, and peers within the organization.'}
          {role === 'HR Manager' && 'Top-down structural view with live capacity and attrition risk analytics.'}
          {role === 'IT Admin' && 'Infrastructure topology map tracking hardware endpoints and SaaS saturation.'}
          {role === 'Finance Executive' && 'Financial heatmap identifying run-rate variance across cost centers.'}
          {role === 'Super Admin' && 'Raw schema representation and tenant node management.'}
          {role === 'Administrator' && 'Infrastructure topology map tracking hardware endpoints and SaaS saturation.'}
        </p>
      </header>

      {role === 'Standard Employee' && renderEmployeeView()}
      {role === 'HR Manager' && renderHRManagerView()}
      {(role === 'IT Admin' || role === 'Administrator') && renderITAdminView()}
      {role === 'Finance Executive' && renderFinanceView()}
      {role === 'Super Admin' && renderSuperAdminView()}
    </div>
  );
};

export default OrgChartView;
