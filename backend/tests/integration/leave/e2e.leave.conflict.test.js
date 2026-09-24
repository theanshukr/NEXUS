import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { startDb, stopDb, clearDb } from '../../setup/db.js';

import LeavePolicyRepository from '#@/modules/leave/repositories/LeavePolicyRepository.js';
import LeaveBalanceRepository from '#@/modules/leave/repositories/LeaveBalanceRepository.js';
import LeaveBalanceService from '#@/modules/leave/services/LeaveBalanceService.js';
import LeaveRequestService from '#@/modules/leave/services/LeaveRequestService.js';
import LeaveSyncService from '#@/modules/attendance/services/LeaveSyncService.js';
import AttendanceRecordRepository from '#@/modules/attendance/repositories/AttendanceRecordRepository.js';
import AttendanceConflictController from '#@/modules/attendance/controllers/AttendanceConflictController.js';
import LeaveSnapshotService from '#@/modules/leave/services/LeaveSnapshotService.js';
import LeaveBalanceSnapshotRepository from '#@/modules/leave/repositories/LeaveBalanceSnapshotRepository.js';
import LeaveRequestRepository from '#@/modules/leave/repositories/LeaveRequestRepository.js';
import EventBus from '#@/core/events/EventBus.js';

// We need a dummy calendar service for tests or we can just mock it or rely on a fallback
import CalendarService from '#@/modules/calendar/services/CalendarService.js';
import EmployeeRepository from '#@/modules/employees/repositories/EmployeeRepository.js';

describe('E2E Leave Conflict Resolution & Snapshots', () => {
  let orgId = new mongoose.Types.ObjectId();
  let empId = new mongoose.Types.ObjectId();
  let hrId = new mongoose.Types.ObjectId();
  
  let policy;
  let request;

  beforeAll(async () => {
    await startDb();
    
    // Mock CalendarService for net days calculation
    CalendarService.calculateNetWorkingDays = async () => 1;

    // Seed dummy employee with shiftId and locationId for LeaveSyncService
    await EmployeeRepository.createScoped({
      _id: empId,
      employeeCode: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      departmentId: new mongoose.Types.ObjectId(),
      designationId: new mongoose.Types.ObjectId(),
      shiftId: new mongoose.Types.ObjectId(),
      locationId: new mongoose.Types.ObjectId(),
      workEmail: 'john.doe@example.com',
      joiningDate: new Date('2025-01-01')
    }, orgId);
  });

  afterAll(async () => {
    await stopDb();
  });

  it('1. Setup policy and initialize balance', async () => {
    policy = await LeavePolicyRepository.createScoped({
      name: 'Annual Leave',
      code: 'AL',
      version: 1,
      isActive: true,
      annualAllowance: 20,
      accrualFrequency: 'MONTHLY',
      effectiveFrom: new Date()
    }, orgId);

    const balance = await LeaveBalanceService.getOrInitializeBalance(orgId, empId, 2026);
    expect(balance.balances.length).toBeGreaterThan(0);
    expect(balance.balances.find(b => b.code === 'AL').totalAllocated).toBe(20);

    // Manually accrue some balance so request can succeed
    await LeaveBalanceRepository.updateByIdAndTenant(balance._id, {
      'balances.0.accrued': 10
    }, orgId);
  });

  it('2. Employee applies for leave', async () => {
    const payload = {
      leaveCode: 'AL',
      startDate: new Date('2026-05-10T00:00:00.000Z'),
      endDate: new Date('2026-05-10T00:00:00.000Z'),
      isHalfDay: false,
      reason: 'Vacation'
    };

    request = await LeaveRequestService.submitRequest(orgId, empId, payload);
    expect(request.status).toBe('PENDING');

    const bal = await LeaveBalanceRepository.getEmployeeBalance(orgId, empId, 2026);
    expect(bal.balances.find(b => b.code === 'AL').pending).toBe(1);
  });

  it('3. Manager approves leave & triggers sync', async () => {
    // Approve
    const updated = await LeaveRequestService.approveRequest(orgId, request._id, hrId, 'Approved by manager');
    expect(updated.status).toBe('APPROVED');

    const bal = await LeaveBalanceRepository.getEmployeeBalance(orgId, empId, 2026);
    expect(bal.balances.find(b => b.code === 'AL').used).toBe(1);
    expect(bal.balances.find(b => b.code === 'AL').pending).toBe(0);

    // Sync to attendance
    await LeaveSyncService.markLeave({
      organizationId: orgId,
      employeeId: empId,
      leaveRequestId: updated._id,
      leaveCode: updated.leaveCode,
      startDate: updated.startDate,
      endDate: updated.endDate,
      isHalfDay: updated.isHalfDay
    });

    const record = await AttendanceRecordRepository.findOne({
      employeeId: empId,
      date: '2026-05-10'
    }, orgId);

    expect(record).not.toBeNull();
    expect(record.attendanceStatus).toBe('LEAVE');
    expect(record.isLeave).toBe(true);
  });

  it('4. Employee clocks in creating an attendance conflict', async () => {
    const record = await AttendanceRecordRepository.findOne({
      employeeId: empId,
      date: '2026-05-10'
    }, orgId);

    // Simulate clock in
    await AttendanceRecordRepository.updateByIdAndTenant(record._id, {
      attendanceStatus: 'PRESENT',
      attendanceEvents: [{ eventType: 'CLOCK_IN', originalTime: new Date() }]
    }, orgId);

    // Later, leave sync is triggered again (e.g. by an update) or HR cancels it
    await LeaveSyncService.removeLeave({
      organizationId: orgId,
      employeeId: empId,
      leaveRequestId: request._id
    });

    const updatedRecord = await AttendanceRecordRepository.findByIdAndTenant(record._id, orgId);
    expect(updatedRecord.conflictStatus).toBe('PENDING_REVIEW');
    expect(updatedRecord.attendanceStatus).toBe('PRESENT'); // Not reverted to ABSENT
  });

  it('5. HR resolves conflict as KEEP_ATTENDANCE', async () => {
    const record = await AttendanceRecordRepository.findOne({
      employeeId: empId,
      date: '2026-05-10'
    }, orgId);

    // Mock Express Request
    const req = {
      params: { id: record._id },
      tenantId: orgId,
      user: { userId: hrId },
      body: {
        resolutionType: 'KEEP_ATTENDANCE',
        resolutionNotes: 'Employee came to work'
      }
    };
    
    let responseData;
    const res = {
      status: (code) => ({
        json: (data) => { responseData = data; }
      })
    };
    const next = (err) => { throw err; };

    // Register event listener first
    const AttendanceEventListener = (await import('#@/modules/leave/listeners/AttendanceEventListener.js')).default;
    AttendanceEventListener.register();

    await AttendanceConflictController.resolveConflict(req, res, next);
    expect(responseData.success).toBe(true);
    expect(responseData.data.conflictStatus).toBe('RESOLVED');

    // Wait for async event to process
    await new Promise(resolve => setTimeout(resolve, 500));

    // Leave should be cancelled
    const reqDb = await LeaveRequestRepository.findByIdAndTenant(request._id, orgId);
    expect(reqDb.status).toBe('CANCELLED');

    // Balance should be restored
    const bal = await LeaveBalanceRepository.getEmployeeBalance(orgId, empId, 2026);
    expect(bal.balances.find(b => b.code === 'AL').used).toBe(0);
  });

  it('6. Payroll engine triggers a snapshot', async () => {
    const result = await LeaveSnapshotService.takeSnapshotForPayrollCycle(
      orgId,
      '2026-P05',
      new Date('2026-05-01'),
      new Date('2026-05-31')
    );

    expect(result.createdCount).toBe(1);

    const snapshot = await LeaveBalanceSnapshotRepository.getEmployeeSnapshotForCycle(orgId, empId, '2026-P05');
    expect(snapshot).not.toBeNull();
    expect(snapshot.cycleIdentifier).toBe('2026-P05');
    expect(snapshot.balances.find(b => b.code === 'AL').used).toBe(0); // Restored!
  });
});
