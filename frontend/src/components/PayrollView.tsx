import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import AnimatedCounter from './AnimatedCounter';
import { useToast } from './ToastProvider';

interface PayrollViewProps {
  role: string;
  user?: any;
}

// ==========================================
// MOCK DATA
// ==========================================

const myPayslips = [
  { id: 'PS-1123', month: 'November 2023', gross: 8500, tax: 1870, deductions: 450, net: 6180, status: 'Paid' },
  { id: 'PS-1023', month: 'October 2023', gross: 8500, tax: 1870, deductions: 450, net: 6180, status: 'Paid' },
  { id: 'PS-0923', month: 'September 2023', gross: 8500, tax: 1870, deductions: 450, net: 6180, status: 'Paid' }
];

const globalPayrollRun = {
  month: 'December 2023',
  status: 'Pending Funding',
  totalGross: 1250000,
  totalTaxes: 285000,
  totalBenefits: 115000,
  totalNet: 850000,
  employees: 145,
  ledger: [
    { id: 'E-001', name: 'Alex Johnson', department: 'Engineering', gross: 9500, net: 6850, status: 'Pending' },
    { id: 'E-002', name: 'Maria Garcia', department: 'Sales', gross: 12000, net: 8200, status: 'Pending' },
    { id: 'E-003', name: 'David Chen', department: 'Marketing', gross: 7500, net: 5400, status: 'Pending' },
    { id: 'E-004', name: 'Sarah Jenkins', department: 'IT', gross: 8200, net: 5950, status: 'Pending' },
  ]
};

// ==========================================
// EMPLOYEE VIEW (Personal Payslip Generation)
// ==========================================
const EmployeePayrollView = ({ user }: { user?: any }) => {
  const { showToast } = useToast();
  const [selectedPayslip, setSelectedPayslip] = useState<typeof myPayslips[0] | null>(null);
  const [payslips, setPayslips] = useState(myPayslips);
  const [payslipDetail, setPayslipDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleSelectPayslip = async (ps: any) => {
    setSelectedPayslip(ps);
    if (ps._id) {
      setLoadingDetail(true);
      try {
        const res = await apiClient.get(`/payroll/payslips/${ps._id}`);
        if (res.data?.data) setPayslipDetail(res.data.data);
      } catch (e) {
        setPayslipDetail(null);
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  const handleDownloadPDF = () => {
    if (!selectedPayslip) return;
    const earnings = payslipDetail?.earnings || [{ name: 'Base Salary', amount: selectedPayslip.gross }];
    const deductions = payslipDetail?.deductions || [
      { name: 'Federal Tax', amount: 1250 },
      { name: 'State Tax (CA)', amount: 620 },
      { name: 'Health Insurance', amount: 250 },
      { name: '401k Contribution', amount: 200 },
    ];
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head>
        <title>Payslip - ${selectedPayslip.month}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; padding: 48px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px dashed #e2e8f0; margin-bottom: 32px; }
          .header h1 { font-size: 32px; font-weight: 900; letter-spacing: -1px; }
          .header .month { font-size: 15px; color: #64748b; margin-top: 4px; }
          .company-info { text-align: right; }
          .company-info h3 { font-size: 18px; font-weight: 700; }
          .company-info p { font-size: 13px; color: #64748b; margin-top: 4px; line-height: 1.6; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-bottom: 32px; }
          .section h4 { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin-bottom: 16px; }
          .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
          .row span:last-child { font-weight: 600; }
          .total-row { display: flex; justify-content: space-between; padding: 14px 0; font-size: 15px; font-weight: 800; margin-top: 8px; }
          .green { color: #10b981; }
          .red { color: #ef4444; }
          .net-box { background: #0f172a; color: #fff; padding: 28px 36px; border-radius: 14px; display: flex; justify-content: space-between; align-items: center; }
          .net-box p { font-size: 13px; opacity: 0.6; margin-bottom: 6px; }
          .net-box h2 { font-size: 36px; font-weight: 900; color: #10b981; }
          .badge { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); padding: 8px 20px; border-radius: 24px; font-size: 14px; font-weight: 700; }
          @media print { body { padding: 24px; } }
        </style>
      </head><body>
        <div class="header">
          <div><h1>Payslip</h1><p class="month">${selectedPayslip.month} &nbsp;·&nbsp; ID: ${selectedPayslip.id}</p></div>
          <div class="company-info"><h3>Nexus Flow Inc.</h3><p>123 Enterprise Way<br/>San Francisco, CA 94105</p></div>
        </div>
        <div class="grid">
          <div class="section">
            <h4>Earnings</h4>
            ${earnings.map((e: any) => `<div class="row"><span>${e.name || e.component}</span><span>$${(e.amount || 0).toLocaleString()}.00</span></div>`).join('')}
            <div class="total-row green"><span>Total Gross</span><span>$${selectedPayslip.gross.toLocaleString()}.00</span></div>
          </div>
          <div class="section">
            <h4>Taxes &amp; Deductions</h4>
            ${deductions.map((d: any) => `<div class="row"><span>${d.name || d.component}</span><span>-$${(d.amount || 0).toLocaleString()}.00</span></div>`).join('')}
            <div class="total-row red"><span>Total Deductions</span><span>-$${(selectedPayslip.tax + selectedPayslip.deductions).toLocaleString()}.00</span></div>
          </div>
        </div>
        <div class="net-box">
          <div><p>Net Pay Amount</p><h2>$${selectedPayslip.net.toLocaleString()}.00</h2></div>
          <div class="badge">✓ ${selectedPayslip.status}</div>
        </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  useEffect(() => {

    const fetchPayslips = async () => {
      try {
        const res = await apiClient.get('/payroll/payslips/my');
        if (res.data?.data) {
          const mapped = res.data.data.map((ps: any) => ({
            _id: ps._id, // keep real id for detail fetch
            id: ps.payslipId || ps._id.substring(0, 8).toUpperCase(),
            month: new Date(ps.periodStartDate || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            gross: ps.grossPay,
            tax: ps.totalTaxes,
            deductions: ps.totalDeductions,
            net: ps.netPay,
            status: ps.status === 'PUBLISHED' ? 'Paid' : 'Pending'
          }));
          setPayslips(mapped.length > 0 ? mapped : myPayslips);
        }
      } catch (err) {
        console.error('Failed to fetch payslips', err);
      }
    };
    fetchPayslips();
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
      
      {/* Current Compensation Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined">payments</span>
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Annual Base Salary</h3>
          </div>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 800, letterSpacing: '-1px' }}>
            {user?.payroll?.baseSalary ? `${user.payroll.currency === 'INR' ? '₹' : '$'}${(user.payroll.baseSalary).toLocaleString()}` : '$102,000'}
          </p>
          <p style={{ margin: '8px 0 0 0', fontSize: '13px', opacity: 0.6 }}>Effective from Jan 1, 2026</p>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined">trending_up</span>
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>YTD Earnings</h3>
          </div>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 800, letterSpacing: '-1px' }}>$93,500</p>
          <p style={{ margin: '8px 0 0 0', fontSize: '13px', opacity: 0.6 }}>As of Nov 30, 2023</p>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined">account_balance</span>
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>YTD Taxes & Deductions</h3>
          </div>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 800, letterSpacing: '-1px' }}>$25,520</p>
          <p style={{ margin: '8px 0 0 0', fontSize: '13px', opacity: 0.6 }}>Includes Federal, State & Benefits</p>
        </div>
      </div>

      {/* Payslip History */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: 800 }}>Payslip History</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {payslips.map(ps => (
            <div key={ps.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--cutout-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--glass-border-light)', transition: 'transform 0.2s', cursor: 'pointer' }} onClick={() => handleSelectPayslip(ps)} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--color-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined">receipt_long</span>
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{ps.month}</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.6 }}>Payslip ID: {ps.id}</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '13px', opacity: 0.6 }}>Net Pay</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 800, color: '#10b981' }}>${ps.net.toLocaleString()}</p>
                </div>
                <span style={{ padding: '6px 12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                  {ps.status}
                </span>
                <span className="material-symbols-outlined" style={{ opacity: 0.3 }}>chevron_right</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedPayslip && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setSelectedPayslip(null); setPayslipDetail(null); }}>
          <div style={{ width: '700px', background: 'var(--color-background-base)', borderRadius: '24px', padding: '40px', position: 'relative', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { setSelectedPayslip(null); setPayslipDetail(null); }} style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.5 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>close</span>
            </button>
            
            {loadingDetail ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', animation: 'spin 1s linear infinite' }}>sync</span>
                <p>Loading payslip details...</p>
              </div>
            ) : (
            <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px dashed rgba(0,0,0,0.1)', paddingBottom: '24px', marginBottom: '24px' }}>
              <div>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 800 }}>Payslip</h2>
                <p style={{ margin: 0, fontSize: '16px', opacity: 0.7 }}>{selectedPayslip.month}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700 }}>Nexus Flow Inc.</h3>
                <p style={{ margin: 0, fontSize: '14px', opacity: 0.6 }}>123 Enterprise Way<br/>San Francisco, CA 94105</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '32px' }}>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.5, marginBottom: '16px' }}>Earnings</h4>
                {payslipDetail?.earnings ? payslipDetail.earnings.map((e: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '15px' }}>
                    <span>{e.component || e.name}</span>
                    <span style={{ fontWeight: 600 }}>${(e.amount || 0).toLocaleString()}</span>
                  </div>
                )) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '15px' }}>
                    <span>Base Salary</span>
                    <span style={{ fontWeight: 600 }}>${selectedPayslip.gross.toLocaleString()}.00</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.1)', fontSize: '16px', fontWeight: 800, color: '#10b981' }}>
                  <span>Total Gross</span>
                  <span>${selectedPayslip.gross.toLocaleString()}.00</span>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.5, marginBottom: '16px' }}>Taxes & Deductions</h4>
                {payslipDetail?.deductions ? payslipDetail.deductions.map((d: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '15px' }}>
                    <span>{d.component || d.name}</span>
                    <span style={{ fontWeight: 600 }}>-${(d.amount || 0).toLocaleString()}</span>
                  </div>
                )) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '15px' }}><span>Federal Tax</span><span style={{ fontWeight: 600 }}>-$1,250.00</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '15px' }}><span>State Tax (CA)</span><span style={{ fontWeight: 600 }}>-$620.00</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '15px' }}><span>Health Insurance</span><span style={{ fontWeight: 600 }}>-$250.00</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '15px' }}><span>401k Contribution</span><span style={{ fontWeight: 600 }}>-$200.00</span></div>
                  </>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.1)', fontSize: '16px', fontWeight: 800, color: '#ef4444' }}>
                  <span>Total Deductions</span>
                  <span>-${(selectedPayslip.tax + selectedPayslip.deductions).toLocaleString()}.00</span>
                </div>
              </div>
            </div>

            <div style={{ background: '#0f172a', color: '#fff', padding: '24px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '14px', opacity: 0.7 }}>Net Pay Amount</p>
                <p style={{ margin: 0, fontSize: '32px', fontWeight: 800, color: '#10b981' }}>${selectedPayslip.net.toLocaleString()}.00</p>
              </div>
              <button className="btn btn-primary" onClick={handleDownloadPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#38bdf8' }}>
                <span className="material-symbols-outlined">download</span>
                Download PDF
              </button>
            </div>
            </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// ADMIN VIEW (Global Payroll Run)
// ==========================================
const AdminPayrollView = () => {
  const { showToast } = useToast();
  const [adminRun, setAdminRun] = useState<any>(globalPayrollRun);
  const [activeCycle, setActiveCycle] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [selectedAdminPayslip, setSelectedAdminPayslip] = useState<any>(null);

  const fetchDashboardData = async () => {
    try {
      const cycleRes = await apiClient.get('/payroll/cycles');
      const cycles = cycleRes.data?.data || [];
      const latestCycle = cycles[0];
      setActiveCycle(latestCycle);

      const runRes = await apiClient.get('/payroll/runs');
      const runs = runRes.data?.data || [];
      const latestRun = runs[0];

      if (latestRun) {
        const payslipsRes = await apiClient.get(`/payroll/payslips/run/${latestRun._id}`);
        const payslips = payslipsRes.data?.data || [];
        
        let totalTaxes = 0;
        let totalBenefits = 0;
        
        const ledger = payslips.map((ps: any) => {
          totalTaxes += ps.taxSnapshot?.amount || 0; // simplistic
          totalBenefits += (ps.grossPay - ps.netPay - (ps.taxSnapshot?.amount || 0));
          return {
            id: ps.employeeId?.toString().substring(0, 6).toUpperCase() || 'EMP',
            name: ps.employee?.firstName ? `${ps.employee.firstName} ${ps.employee.lastName}` : 'Employee',
            department: ps.employee?.department || 'General',
            gross: ps.grossPay || 0,
            net: ps.netPay || 0,
            status: ps.status
          };
        });

        setAdminRun({
          id: latestRun._id,
          month: latestCycle ? latestCycle.cycleIdentifier : 'Current Month',
          status: latestRun.status,
          totalGross: latestRun.totalGross || 0,
          totalTaxes,
          totalBenefits,
          totalNet: latestRun.totalNet || 0,
          employees: payslips.length,
          ledger: ledger.length > 0 ? ledger : globalPayrollRun.ledger // fallback to mock ledger if empty for UI purposes
        });
      }
    } catch(err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleInitiatePayout = async () => {
    let currentCycle = activeCycle;
    try {
      if (!currentCycle) {
        // Auto-create cycle for demo purposes
        const now = new Date();
        const cycleName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
        const res = await apiClient.post('/payroll/cycles', {
          cycleIdentifier: cycleName,
          cycleStart: new Date(now.getFullYear(), now.getMonth(), 1),
          cycleEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0),
          payDate: new Date(now.getFullYear(), now.getMonth() + 1, 1) // Pay on 1st of next month
        });
        currentCycle = res.data?.data;
        setActiveCycle(currentCycle);
      }
      
      setIsProcessing(true);
      await apiClient.post('/payroll/runs', { payrollCycleId: currentCycle._id });
      await fetchDashboardData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error?.message || err.response?.data?.message || "Failed to initiate payroll run.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLockRun = async () => {
    if (!adminRun?.id) {
      alert("No active payroll run found in the database to lock.");
      return;
    }
    setIsLocking(true);
    try {
      await apiClient.post(`/payroll/runs/${adminRun.id}/lock`);
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Failed to lock payroll run.");
    } finally {
      setIsLocking(false);
    }
  };

  const handleFinalizePayslips = async () => {
    if (!adminRun?.id) {
      alert("No active payroll run found in the database to finalize.");
      return;
    }
    setIsFinalizing(true);
    try {
      await apiClient.post(`/payroll/runs/${adminRun.id}/finalize-payslips`);
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Failed to finalize payslips.");
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 800 }}>{adminRun.month} Payroll Run</h2>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ padding: '6px 12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>hourglass_empty</span>
              {adminRun.status}
            </span>
            <span style={{ fontSize: '14px', opacity: 0.6 }}>{adminRun.employees} Employees</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={handleInitiatePayout} disabled={isProcessing || adminRun?.status === 'COMPLETED' || adminRun?.status === 'LOCKED'} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '15px', opacity: (isProcessing || adminRun?.status === 'COMPLETED' || adminRun?.status === 'LOCKED') ? 0.5 : 1 }}>
            <span className="material-symbols-outlined">{isProcessing ? 'sync' : 'play_circle'}</span>
            {isProcessing ? 'Processing...' : 'Initiate Payout'}
          </button>
          <button className="btn btn-glass" onClick={handleFinalizePayslips} disabled={isFinalizing || !adminRun?.id || adminRun?.status === 'LOCKED'} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', fontSize: '14px', opacity: (isFinalizing || !adminRun?.id || adminRun?.status === 'LOCKED') ? 0.5 : 1 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{isFinalizing ? 'sync' : 'check_circle'}</span>
            {isFinalizing ? 'Finalizing...' : 'Finalize Payslips'}
          </button>
          <button className="btn btn-glass" onClick={handleLockRun} disabled={isLocking || !adminRun?.id || adminRun?.status === 'LOCKED'} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', fontSize: '14px', opacity: (isLocking || !adminRun?.id || adminRun?.status === 'LOCKED') ? 0.5 : 1 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{isLocking ? 'sync' : 'lock'}</span>
            {isLocking ? 'Locking...' : 'Lock Run'}
          </button>
        </div>
      </div>

      {/* Aggregate Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        <div className="glass-cutout interactive animate-fade-in-up" style={{ padding: '24px', animationDelay: '0.1s' }}>
          <p className="text-metadata" style={{ margin: '0 0 8px 0', opacity: 0.8 }}>Total Gross Payroll</p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}><AnimatedCounter prefix="$" value={adminRun.totalGross} /></p>
        </div>
        <div className="glass-cutout interactive animate-fade-in-up" style={{ padding: '24px', animationDelay: '0.2s' }}>
          <p className="text-metadata" style={{ margin: '0 0 8px 0', opacity: 0.8, color: '#ef4444' }}>Total Taxes (Employer + Employee)</p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#ef4444' }}><AnimatedCounter prefix="$" value={adminRun.totalTaxes} /></p>
        </div>
        <div className="glass-cutout interactive animate-fade-in-up" style={{ padding: '24px', animationDelay: '0.3s' }}>
          <p className="text-metadata" style={{ margin: '0 0 8px 0', opacity: 0.8, color: '#f59e0b' }}>Total Benefits Contributions</p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}><AnimatedCounter prefix="$" value={adminRun.totalBenefits} /></p>
        </div>
        <div className="glass-cutout interactive animate-fade-in-up" style={{ padding: '24px', animationDelay: '0.4s' }}>
          <p className="text-metadata" style={{ margin: '0 0 8px 0', opacity: 0.8, color: '#10b981' }}>Total Net Payout</p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#10b981' }}><AnimatedCounter prefix="$" value={adminRun.totalNet} /></p>
        </div>
      </div>

      {/* Pipeline Status */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 700 }}>Run Status Pipeline</h3>
        <div style={{ display: 'flex', position: 'relative' }}>
          {[
            { step: 'Draft Generated', status: adminRun.status === 'PROCESSING' ? 'current' : 'done' },
            { step: 'HR Review', status: adminRun.status === 'COMPLETED' ? 'current' : (adminRun.status === 'LOCKED' ? 'done' : 'pending') },
            { step: 'Funding', status: adminRun.status === 'LOCKED' ? 'current' : 'pending' },
            { step: 'Paid Out', status: adminRun.status === 'PAID' ? 'done' : 'pending' }
          ].map((s, i, arr) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {i < arr.length - 1 && (
                <div style={{ position: 'absolute', top: '14px', left: '50%', width: '100%', height: '4px', background: s.status === 'done' ? '#10b981' : 'var(--cutout-bg)', zIndex: 0 }}></div>
              )}
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: s.status === 'done' ? '#10b981' : s.status === 'current' ? '#38bdf8' : 'var(--cutout-bg)', border: s.status === 'pending' ? '2px solid var(--color-ui-element)' : '2px solid transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: s.status === 'current' ? '0 0 0 6px rgba(56,189,248,0.2)' : 'none', zIndex: 1 }}>
                {s.status === 'done' && <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>}
                {s.status === 'current' && <span style={{ width: '10px', height: '10px', background: '#fff', borderRadius: '50%' }}></span>}
              </div>
              <span style={{ fontSize: '13px', fontWeight: s.status === 'current' ? 700 : 500, opacity: s.status === 'pending' ? 0.5 : 1, marginTop: '12px', textAlign: 'center' }}>{s.step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Employee Ledger */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 700 }}>Employee Ledger</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.1)', color: 'var(--color-text-secondary)', fontSize: '13px', textTransform: 'uppercase' }}>
              <th style={{ padding: '0 0 12px 0', fontWeight: 600 }}>Employee</th>
              <th style={{ padding: '0 0 12px 0', fontWeight: 600 }}>Department</th>
              <th style={{ padding: '0 0 12px 0', fontWeight: 600 }}>Gross Pay</th>
              <th style={{ padding: '0 0 12px 0', fontWeight: 600 }}>Net Pay</th>
              <th style={{ padding: '0 0 12px 0', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '0 0 12px 0', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {adminRun.ledger.map((emp: any) => (
              <tr key={emp.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <td style={{ padding: '16px 0', fontWeight: 600 }}>
                  {emp.name}
                  <div style={{ fontSize: '12px', opacity: 0.6, fontWeight: 400 }}>{emp.id}</div>
                </td>
                <td style={{ padding: '16px 0' }}>
                  <span style={{ padding: '4px 8px', background: 'var(--cutout-bg)', borderRadius: '8px', fontSize: '12px' }}>{emp.department}</span>
                </td>
                <td style={{ padding: '16px 0', fontWeight: 500 }}>${emp.gross.toLocaleString()}</td>
                <td style={{ padding: '16px 0', fontWeight: 700, color: '#10b981' }}>${emp.net.toLocaleString()}</td>
                <td style={{ padding: '16px 0' }}>
                  <span style={{ padding: '4px 8px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>{emp.status}</span>
                </td>
                <td style={{ padding: '16px 0', textAlign: 'right' }}>
                  <button onClick={() => setSelectedAdminPayslip(emp)} className="btn btn-glass" style={{ padding: '6px 12px', fontSize: '12px' }}>View Payslip</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
      {selectedAdminPayslip && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '400px', padding: '24px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Payslip Detail</h2>
            <p style={{ fontSize: '14px', opacity: 0.7, marginBottom: '24px' }}>{selectedAdminPayslip.name} - {selectedAdminPayslip.department}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--cutout-border)' }}>
                <span>Gross Pay</span>
                <span style={{ fontWeight: 600 }}>${selectedAdminPayslip.gross?.toLocaleString() || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--cutout-border)' }}>
                <span>Net Pay</span>
                <span style={{ fontWeight: 800, color: '#10b981' }}>${selectedAdminPayslip.net?.toLocaleString() || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Status</span>
                <span style={{ fontWeight: 600 }}>{selectedAdminPayslip.status}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedAdminPayslip(null)} className="btn btn-glass" style={{ padding: '8px 16px' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ==========================================
// MAIN WRAPPER
// ==========================================
const PayrollView: React.FC<PayrollViewProps> = ({ role, user }) => {
  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <header style={{ marginBottom: '40px' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', letterSpacing: '-1px' }}>Payroll & Compensation</h1>
          <p style={{ margin: 0, opacity: 0.7, fontSize: '16px' }}>Manage earnings, deductions, and tax documentation.</p>
        </header>

        {role === 'Finance Executive' || role === 'Super Admin' ? <AdminPayrollView /> : <EmployeePayrollView user={user} />}
      </div>
    </div>
  );
};

export default PayrollView;
