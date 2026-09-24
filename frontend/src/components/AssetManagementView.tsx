import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useToast } from './ToastProvider';

export default function AssetManagementView({ role, user }: { role: string, user?: any }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'registry' | 'allocations'>('registry');
  const [assets, setAssets] = useState<any[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [newRequestType, setNewRequestType] = useState('Laptop');
  const [showSignModal, setShowSignModal] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  
  const isAdminView = role === 'Administrator' || role === 'IT Admin' || role === 'Super Admin';

  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Rajesh Sharma';
  const myAssets = assets.filter(a => a.assignedTo === fullName);

  const fetchAssets = async () => {
    try {
      const res = await apiClient.get('/assets');
      if (res.data?.data) {
        setAssets(Array.isArray(res.data.data) ? res.data.data : res.data.data.items || []);
      }
    } catch (err) {
      showToast('Error', 'error', 'Failed to fetch assets');
      setAssets([]);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleAssignAsset = async (id: string) => {
    const assignee = prompt('Enter the name of the employee to assign this asset to:');
    if (!assignee) return;
    try {
      await apiClient.patch(`/assets/${id}`, { assignedTo: assignee, status: 'In Use' });
      showToast('Success', 'success', 'Asset assigned successfully');
      fetchAssets();
    } catch (err: any) {
      showToast('Error', 'error', err.response?.data?.error || 'Failed to assign asset');
    }
  };

  const handleRevokeAsset = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this asset?')) return;
    try {
      await apiClient.patch(`/assets/${id}`, { assignedTo: 'Unassigned', status: 'In Stock' });
      showToast('Success', 'success', 'Asset revoked successfully');
      fetchAssets();
    } catch (err: any) {
      showToast('Error', 'error', err.response?.data?.error || 'Failed to revoke asset');
    }
  };

  const handleReportIssue = async (id: string) => {
    const description = prompt('Please describe the issue with this asset:');
    if (!description) return;
    try {
      await apiClient.patch(`/assets/${id}`, { status: 'Maintenance', condition: 'Repair' });
      showToast('Success', 'success', 'Issue reported to IT');
      fetchAssets();
    } catch (err: any) {
      showToast('Error', 'error', err.response?.data?.error || 'Failed to report issue');
    }
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case 'In Use': return <span style={{ padding: '4px 10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '11px', fontWeight: 600, borderRadius: '12px' }}>In Use</span>;
      case 'In Stock': return <span style={{ padding: '4px 10px', background: 'rgba(14, 165, 233, 0.1)', color: '#38bdf8', fontSize: '11px', fontWeight: 600, borderRadius: '12px' }}>In Stock</span>;
      case 'Maintenance': return <span style={{ padding: '4px 10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '11px', fontWeight: 600, borderRadius: '12px' }}>Maintenance</span>;
      default: return null;
    }
  };

  const renderTypeIcon = (type: string) => {
    switch (type) {
      case 'Laptop': return 'laptop_mac';
      case 'Monitor': return 'desktop_windows';
      case 'Mobile': return 'smartphone';
      default: return 'devices';
    }
  };

  // ─── ADMIN / IT VIEW ──────────────────────────────────────────────────
  if (isAdminView) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>Asset Inventory</h2>
            <p className="text-secondary" style={{ fontSize: '14px' }}>Module M-10: Hardware & Software Registry</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => {
              const serialNumber = prompt('Enter Asset Serial Number to Scan:');
              if (serialNumber) showToast('Scanned', 'success', `Asset ${serialNumber} scanned successfully.`);
            }} className="btn btn-glass" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>qr_code_scanner</span> Scan Asset
            </button>
            <button onClick={() => setShowRequestModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span> Add Asset
            </button>
          </div>
        </div>

        <div className="grid-12">
          {/* KPI Cards */}
          <div className="glass-panel" style={{ gridColumn: 'span 3', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Total Assets</h3>
                <p style={{ fontSize: '32px', fontWeight: 300, margin: 0 }}>{assets.length}</p>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ui-element)' }}>
                <span className="material-symbols-outlined">inventory_2</span>
              </div>
            </div>
          </div>
          <div className="glass-panel" style={{ gridColumn: 'span 3', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Allocated</h3>
                <p style={{ fontSize: '32px', fontWeight: 300, margin: 0 }}>{assets.filter(a => a.assignedTo !== 'Unassigned').length}</p>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <span className="material-symbols-outlined">person_check</span>
              </div>
            </div>
          </div>
          <div className="glass-panel" style={{ gridColumn: 'span 3', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>In Stock</h3>
                <p style={{ fontSize: '32px', fontWeight: 300, margin: 0 }}>{assets.filter(a => a.assignedTo === 'Unassigned').length}</p>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                <span className="material-symbols-outlined">inventory</span>
              </div>
            </div>
          </div>
          <div className="glass-panel" style={{ gridColumn: 'span 3', padding: '24px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(255,255,255,0) 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Expiring Warranty</h3>
                <p style={{ fontSize: '32px', fontWeight: 300, margin: 0, color: '#f59e0b' }}>0</p>
                <p style={{ fontSize: '11px', color: '#f59e0b', margin: '4px 0 0 0' }}>Expiring within 90 days</p>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                <span className="material-symbols-outlined">warning</span>
              </div>
            </div>
          </div>

          {/* Registry Table */}
          <div className="glass-panel" style={{ gridColumn: 'span 12', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
               <div style={{ display: 'flex', gap: '8px' }}>
                 <button className={`btn ${activeTab === 'registry' ? 'btn-primary' : 'btn-glass'}`} onClick={() => setActiveTab('registry')} style={{ padding: '6px 16px', fontSize: '13px' }}>Full Registry</button>
                 <button className={`btn ${activeTab === 'allocations' ? 'btn-primary' : 'btn-glass'}`} onClick={() => setActiveTab('allocations')} style={{ padding: '6px 16px', fontSize: '13px' }}>Pending Allocations (0)</button>
               </div>
               <div style={{ display: 'flex', gap: '16px' }}>
                 <div style={{ padding: '8px 16px', background: 'var(--cutout-bg)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)', border: '1px solid var(--cutout-border)' }}>
                   <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>search</span>
                   <input type="text" placeholder="Search by ID or Name..." style={{ background: 'transparent', border: 'none', color: 'inherit', outline: 'none', width: '200px' }} />
                 </div>
               </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cutout-bg)', color: 'var(--color-text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Asset</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Assigned To</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Condition</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Warranty</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No assets found in the registry.</td>
                  </tr>
                )}
                {assets.map(asset => (
                  <tr key={asset.id} style={{ borderBottom: '1px solid var(--cutout-bg)', transition: 'background 0.2s ease' }} className="hover-bg">
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--cutout-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--cutout-border)', color: 'var(--color-ui-element)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{renderTypeIcon(asset.type)}</span>
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '14px', margin: 0 }}>{asset.name}</p>
                          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '2px 0 0 0', fontFamily: 'monospace' }}>{asset.id}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px' }}>
                      {asset.assignedTo !== 'Unassigned' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-blob-1)' }}></div>
                          {asset.assignedTo}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>{renderStatus(asset.status)}</td>
                    <td style={{ padding: '16px', fontSize: '13px' }}>
                       <span style={{ color: asset.condition === 'Repair' ? '#ef4444' : 'inherit' }}>{asset.condition}</span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '12px', color: asset.warranty === 'Expired' ? '#ef4444' : 'var(--color-text-secondary)' }}>
                      {asset.warranty}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {asset.assignedTo === 'Unassigned' ? (
                          <button onClick={() => handleAssignAsset(asset.id)} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                            Assign
                          </button>
                        ) : (
                          <button onClick={() => handleRevokeAsset(asset.id)} className="btn btn-glass" style={{ padding: '6px 12px', fontSize: '12px', color: '#ef4444' }}>
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─── EMPLOYEE VIEW ───────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '18px', marginBottom: '4px' }}>My Assigned Devices ({myAssets.length})</h2>
          <p className="text-secondary" style={{ fontSize: '14px' }}>Module M-10: Devices & Equipment</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => {
            const id = prompt('Enter Asset ID to report an issue for:');
            if (id) handleReportIssue(id);
          }} className="btn btn-glass" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>support_agent</span> Report Issue
          </button>
          <button onClick={() => setShowRequestModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>devices</span> Request Asset
          </button>
        </div>
      </div>

      <div className="grid-12">
        {/* Pending Acceptance Alert */}
        {!isSigned && (
          <div className="glass-panel" style={{ gridColumn: 'span 12', padding: '16px 24px', background: 'linear-gradient(90deg, rgba(14, 165, 233, 0.1) 0%, transparent 100%)', borderLeft: '4px solid #38bdf8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined">draw</span>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px' }}>Action Required: Asset Acceptance Form</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>Please sign the IT equipment policy for your new MacBook Pro.</p>
              </div>
            </div>
            <button onClick={() => setShowSignModal(true)} className="btn btn-primary" style={{ padding: '8px 24px', fontSize: '13px' }}>Review & Sign</button>
          </div>
        )}

        {/* Assigned Assets */}
        {myAssets.map((asset: any) => (
          <div key={asset.id} className="glass-panel" style={{ gridColumn: 'span 4', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--cutout-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--cutout-border)', color: 'var(--color-ui-element)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>{renderTypeIcon(asset.type)}</span>
              </div>
              {renderStatus(asset.status)}
            </div>
            
            <div>
              <h3 style={{ fontSize: '16px', margin: '0 0 4px 0' }}>{asset.name}</h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, fontFamily: 'monospace' }}>{asset.id}</p>
            </div>
            
            <div style={{ padding: '16px', background: 'var(--cutout-bg)', borderRadius: '8px', border: '1px solid var(--cutout-border)', marginTop: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Condition</span>
                <span style={{ fontWeight: 600 }}>{asset.condition}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Acquired</span>
                <span style={{ fontWeight: 600 }}>{asset.purchaseDate}</span>
              </div>
            </div>
            
            <button onClick={() => handleReportIssue(asset.id)} className="btn btn-glass" style={{ width: '100%', padding: '8px', fontSize: '12px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              Report Issue
            </button>
          </div>
        ))}

        {/* Add more placeholder card */}
        <div onClick={() => setShowRequestModal(true)} className="glass-panel interactive" style={{ gridColumn: 'span 4', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--color-text-secondary)', borderStyle: 'dashed' }}>
           <span className="material-symbols-outlined" style={{ fontSize: '32px', opacity: 0.5 }}>add_circle</span>
           <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>Request New Equipment</p>
        </div>
      </div>

      {showRequestModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '400px', padding: '24px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Request New Asset</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>Asset Type</label>
              <select value={newRequestType} onChange={e => setNewRequestType(e.target.value)} style={{ width: '100%', padding: '12px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '8px', color: 'inherit', outline: 'none' }}>
                <option value="Laptop">Laptop</option>
                <option value="Monitor">Monitor</option>
                <option value="Phone">Phone</option>
                <option value="Accessory">Accessory</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowRequestModal(false)} className="btn btn-glass" style={{ padding: '8px 16px' }}>Cancel</button>
              <button onClick={async () => {
                try {
                  await apiClient.post('/assets', { name: `Requested ${newRequestType}`, type: newRequestType, condition: 'New' });
                  showToast('Success', 'success', 'Asset request submitted successfully.');
                  setShowRequestModal(false);
                  fetchAssets();
                } catch (e) { showToast('Error', 'error', 'Failed to submit request.'); }
              }} className="btn btn-primary" style={{ padding: '8px 16px' }}>Submit Request</button>
            </div>
          </div>
        </div>
      )}

      {showSignModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '400px', padding: '24px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Sign Asset Policy</h2>
            <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '24px' }}>By signing below, you agree to the company IT equipment usage policy.</p>
            <div style={{ marginBottom: '24px', border: '1px solid var(--cutout-border)', height: '100px', borderRadius: '8px', background: 'var(--cutout-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'cursive', fontSize: '24px', color: '#10b981' }}>{user?.firstName} {user?.lastName}</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSignModal(false)} className="btn btn-glass" style={{ padding: '8px 16px' }}>Cancel</button>
              <button onClick={() => {
                setIsSigned(true);
                setShowSignModal(false);
                showToast('Success', 'success', 'Policy signed successfully.');
              }} className="btn btn-primary" style={{ padding: '8px 16px' }}>Sign & Accept</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
