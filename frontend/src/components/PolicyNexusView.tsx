import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useToast } from './ToastProvider';

export default function PolicyNexusView({ role, user }: { role: string, user?: any }) {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [acknowledgedDocs, setAcknowledgedDocs] = useState<number[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await apiClient.get('/documents');
        if (res.data?.data) {
          setDocuments(Array.isArray(res.data.data) ? res.data.data : res.data.data.items || []);
        }
      } catch (err) {
        showToast('Error', 'error', 'Failed to fetch documents');
        setDocuments([]);
      }
    };
    fetchDocs();
  }, []);

  // RBAC Logic
  const canManageDocs = role === 'HR Manager' || role === 'Super Admin';
  const isEmployee = role === 'Standard Employee';
  const isIT = role === 'Administrator';
  const isFinance = role === 'Finance Executive';

  const categories = ['All', 'Onboarding', 'Policy', 'Finance', 'Benefits', 'Compliance', 'IT'];

  // Filter docs based on search, category, AND role
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    
    // Role specific filtering (Super Admin sees all, others see what's required for them or public)
    const matchesRole = role === 'Super Admin' || canManageDocs || (doc.requiredFor && doc.requiredFor.includes(role));
    
    return matchesSearch && matchesCategory && matchesRole;
  });

  const handleAcknowledge = (id: number) => {
    if (!acknowledgedDocs.includes(id)) {
      setAcknowledgedDocs([...acknowledgedDocs, id]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header & Search */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>
              {isEmployee ? 'My Required Policies' : isIT ? 'IT Security Hub' : isFinance ? 'Financial Document Center' : 'Policy Nexus'}
            </h2>
            <p className="text-secondary" style={{ fontSize: '14px' }}>
              {isEmployee ? 'Review and acknowledge your required compliance documents.' : 'Centralized Document Management (M-06)'}
            </p>
          </div>
          <div className="glass-cutout" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', minWidth: '300px' }}>
             <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)', fontSize: '20px' }}>search</span>
             <input 
               type="text" 
               placeholder="Search policies, forms, handbooks..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '14px', color: 'var(--color-ui-element)', fontFamily: 'inherit' }}
             />
          </div>
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button 
              key={cat}
              className="btn btn-glass"
              style={{ 
                padding: '6px 16px', 
                fontSize: '13px',
                background: selectedCategory === cat ? 'var(--color-accent)' : 'var(--color-glass-surface)',
                color: selectedCategory === cat ? '#fff' : 'var(--color-ui-element)',
                border: 'none'
              }}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-12">
        {/* HR Dashboard (Analytics) */}
        {role === 'HR Manager' && (
          <div className="glass-panel" style={{ gridColumn: 'span 12', padding: '24px', display: 'flex', gap: '24px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Company Compliance Rate</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                <span style={{ fontSize: '36px', fontWeight: 300, lineHeight: 1, color: '#10b981' }}>94%</span>
                <span className="text-secondary" style={{ fontSize: '13px', marginBottom: '6px' }}>of required documents acknowledged</span>
              </div>
            </div>
            <div style={{ width: '1px', background: 'rgba(0,0,0,0.1)' }}></div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Pending Actions</h3>
              <p style={{ fontSize: '14px' }}><strong>12</strong> employees have overdue handbook acknowledgments.</p>
              <button className="btn btn-glass" style={{ padding: '6px 12px', fontSize: '12px', marginTop: '8px' }}>Send Reminders</button>
            </div>
          </div>
        )}

        {/* Upload Area (Conditional Rendering based on Role) */}
        {canManageDocs && (
          <div className="glass-panel" style={{ gridColumn: 'span 12', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(0,0,0,0.1)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--color-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>upload_file</span>
            </div>
            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Upload New Document</h3>
            <p className="text-secondary" style={{ fontSize: '14px', marginBottom: '24px' }}>Drag and drop PDF or Word documents here, or click to browse.</p>
            <input type="file" id="documentUpload" style={{ display: 'none' }} accept=".pdf,.doc,.docx" onChange={async (e) => {
              if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                const formData = new FormData();
                formData.append('file', file);
                try {
                  await apiClient.post('/documents/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                  });
                  showToast('Success', 'success', `Document ${file.name} uploaded successfully.`);
                  // fetchDocs(); // If we had the fetch function accessible here, we'd call it
                } catch (err) {
                  showToast('Error', 'error', 'Failed to upload document');
                }
                e.target.value = ''; // Reset
              }
            }} />
            <button className="btn btn-primary" style={{ padding: '10px 24px' }} onClick={() => document.getElementById('documentUpload')?.click()}>Browse Files</button>
          </div>
        )}

        {/* Document Grid */}
        {filteredDocs.map(doc => {
          const isAcknowledged = doc.acknowledged || acknowledgedDocs.includes(doc.id);
          const needsAcknowledgment = isEmployee && doc.requiredFor && doc.requiredFor.includes('Standard Employee') && !isAcknowledged;

          return (
            <div key={doc.id} className="glass-panel" style={{ gridColumn: 'span 4', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', transition: 'transform 0.2s', cursor: 'pointer', border: needsAcknowledgment ? '2px solid rgba(245, 158, 11, 0.4)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: doc.type === 'pdf' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: doc.type === 'pdf' ? '#ef4444' : '#3b82f6' }}>
                    {doc.type === 'pdf' ? 'picture_as_pdf' : 'description'}
                  </span>
                </div>
                
                {canManageDocs && (
                  <button className="btn btn-glass" style={{ padding: '4px', border: 'none', background: 'transparent' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>more_vert</span>
                  </button>
                )}
                {isEmployee && isAcknowledged && (
                   <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: '20px' }}>check_circle</span>
                )}
              </div>

              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', lineHeight: 1.4 }}>{doc.title}</h4>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: 'var(--cutout-bg)', color: 'var(--color-text-secondary)', display: 'inline-block' }}>
                    {doc.category}
                  </span>
                  {needsAcknowledgment && (
                    <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>Action Required</span>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>{doc.size}</p>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', opacity: 0.7 }}>Updated {doc.updated}</p>
                </div>
                
                {needsAcknowledgment ? (
                  <button 
                    className="btn btn-primary" 
                    onClick={(e) => { e.stopPropagation(); handleAcknowledge(doc.id); }}
                    style={{ padding: '6px 12px', fontSize: '12px', background: '#f59e0b', border: 'none' }}
                  >
                    Acknowledge
                  </button>
                ) : (
                  <button className="btn btn-glass" style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                    Download
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredDocs.length === 0 && (
          <div style={{ gridColumn: 'span 12', padding: '64px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
             <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>search_off</span>
             <p>No documents found matching your search.</p>
          </div>
        )}

      </div>
    </div>
  );
}
