import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useToast } from './ToastProvider';

export default function ExpenseClaimsView({ role, user }: { role: string, user?: any }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [expenses, setExpenses] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({ amount: '', category: 'Travel', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFinanceView = role === 'Finance Executive' || role === 'Super Admin' || role === 'Administrator';

  const fetchExpenses = async () => {
    try {
      const endpoint = isFinanceView ? '/expenses' : '/expenses/my';
      const res = await apiClient.get(endpoint);
      if (res.data?.data) {
        setExpenses(Array.isArray(res.data.data) ? res.data.data : res.data.data.items || []);
      }
    } catch (err) {
      console.log('Failed to fetch expenses');
      setExpenses([]);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [isFinanceView]);

  const handleSubmitExpense = async () => {
    if (!newExpense.amount || !newExpense.description) {
      showToast('Validation Error', 'error', 'Amount and description are required.');
      return;
    }
    const val = parseFloat(newExpense.amount);
    if (isNaN(val) || val <= 0) {
      showToast('Validation Error', 'error', 'Amount must be a positive number.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await apiClient.post('/expenses', { ...newExpense, amount: val });
      showToast('Success', 'success', 'Expense claim submitted successfully.');
      setNewExpense({ amount: '', category: 'Travel', description: '' });
      setIsModalOpen(false);
      fetchExpenses();
    } catch (err: any) {
      showToast('Error', 'error', err.response?.data?.error || 'Failed to submit expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await apiClient.patch(`/expenses/${id}/status`, { status });
      showToast('Success', 'success', `Expense claim ${status.toLowerCase()} successfully.`);
      fetchExpenses();
    } catch (err: any) {
      showToast('Error', 'error', err.response?.data?.error || 'Failed to update status.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Approved': return <span style={{ padding: '4px 10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '11px', fontWeight: 600, borderRadius: '12px' }}>Approved</span>;
      case 'Rejected': return <span style={{ padding: '4px 10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '11px', fontWeight: 600, borderRadius: '12px' }}>Rejected</span>;
      case 'Paid': return <span style={{ padding: '4px 10px', background: 'rgba(14, 165, 233, 0.1)', color: '#38bdf8', fontSize: '11px', fontWeight: 600, borderRadius: '12px' }}>Paid</span>;
      default: return <span style={{ padding: '4px 10px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontSize: '11px', fontWeight: 600, borderRadius: '12px' }}>Pending</span>;
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch(cat) {
      case 'Travel': return 'flight';
      case 'Meals': return 'restaurant';
      case 'Office Supplies': return 'edit_document';
      case 'Internet': return 'wifi';
      default: return 'receipt_long';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>{isFinanceView ? 'Expense Approvals' : 'My Expenses'}</h2>
          <p className="text-secondary" style={{ fontSize: '14px' }}>Module M-11: Expense Claim Management</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {!isFinanceView && (
            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span> New Claim
            </button>
          )}
          {isFinanceView && (
            <button className="btn btn-glass" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>summarize</span> Export Report
            </button>
          )}
        </div>
      </div>

      <div className="grid-12">
        {/* KPI Cards */}
        <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Pending Claims</h3>
              <p style={{ fontSize: '32px', fontWeight: 300, margin: 0 }}>{expenses.filter(e => e.status === 'Pending').length}</p>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <span className="material-symbols-outlined">pending_actions</span>
            </div>
          </div>
        </div>
        <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Approved (Unpaid)</h3>
              <p style={{ fontSize: '32px', fontWeight: 300, margin: 0 }}>{expenses.filter(e => e.status === 'Approved').length}</p>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <span className="material-symbols-outlined">check_circle</span>
            </div>
          </div>
        </div>
        <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Total Payout</h3>
              <p style={{ fontSize: '32px', fontWeight: 300, margin: 0 }}>${expenses.filter(e => e.status === 'Approved' || e.status === 'Paid').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</p>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ui-element)' }}>
              <span className="material-symbols-outlined">payments</span>
            </div>
          </div>
        </div>

        {/* Expenses List */}
        <div className="glass-panel" style={{ gridColumn: 'span 12', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Expense Claims</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--cutout-bg)', color: 'var(--color-text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Description</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Amount</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                {isFinanceView && <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={isFinanceView ? 6 : 5} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No expense claims found.</td>
                </tr>
              )}
              {expenses.map((expense) => (
                <tr key={expense.id} style={{ borderBottom: '1px solid var(--cutout-bg)' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--cutout-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--cutout-border)', color: 'var(--color-ui-element)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{getCategoryIcon(expense.category)}</span>
                      </div>
                      <span style={{ fontWeight: 500, fontSize: '14px' }}>{expense.category}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {expense.description}
                  </td>
                  <td style={{ padding: '16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    {new Date(expense.date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px', fontSize: '14px', fontWeight: 600 }}>
                    ${expense.amount.toFixed(2)}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {getStatusBadge(expense.status)}
                  </td>
                  {isFinanceView && (
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      {expense.status === 'Pending' && (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={() => handleUpdateStatus(expense.id, 'Approved')} className="btn btn-glass" style={{ padding: '4px 10px', fontSize: '12px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)' }}>Approve</button>
                          <button onClick={() => handleUpdateStatus(expense.id, 'Rejected')} className="btn btn-glass" style={{ padding: '4px 10px', fontSize: '12px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>Reject</button>
                        </div>
                      )}
                      {expense.status === 'Approved' && (
                        <button onClick={() => handleUpdateStatus(expense.id, 'Paid')} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }}>Mark Paid</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Claim Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '400px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '20px', margin: 0 }}>Submit Expense Claim</h3>
            
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Category</label>
              <select 
                value={newExpense.category}
                onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '8px', color: 'inherit', outline: 'none' }}
              >
                <option value="Travel">Travel</option>
                <option value="Meals">Meals</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Internet">Internet</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Amount ($)</label>
              <input 
                type="number" 
                step="0.01"
                min="0.01"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                placeholder="0.00"
                style={{ width: '100%', padding: '12px 16px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '8px', color: 'inherit', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Description</label>
              <textarea 
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                placeholder="Client dinner at..."
                style={{ width: '100%', height: '80px', padding: '12px 16px', background: 'var(--cutout-bg)', border: '1px solid var(--cutout-border)', borderRadius: '8px', color: 'inherit', outline: 'none', resize: 'vertical' }}
              ></textarea>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
              <button onClick={() => setIsModalOpen(false)} className="btn btn-glass">Cancel</button>
              <button onClick={handleSubmitExpense} disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? 'Submitting...' : 'Submit Claim'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
