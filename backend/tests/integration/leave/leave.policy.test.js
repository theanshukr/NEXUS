import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import LeavePolicyService from '#@/modules/leave/services/LeavePolicyService.js';
import LeavePolicyRepository from '#@/modules/leave/repositories/LeavePolicyRepository.js';
import { startDb, stopDb, clearDb } from '../../setup/db.js';

describe('Leave Policy Versioning', () => {
  let orgId = new mongoose.Types.ObjectId();
  let adminId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    await startDb();
  });

  afterAll(async () => {
    await stopDb();
  });

  it('creates an initial policy and then versions it on update', async () => {
    const payload = {
      name: 'Sick Leave',
      code: 'SL',
      annualAllowance: 10,
      accrualFrequency: 'MONTHLY'
    };

    // 1. Create Initial
    const policy = await LeavePolicyService.createInitialPolicy(orgId, payload, adminId);
    expect(policy.version).toBe(1);
    expect(policy.isActive).toBe(true);
    
    // 2. Update it
    const updatePayload = {
      annualAllowance: 12
    };
    const updatedPolicy = await LeavePolicyService.updatePolicy(orgId, 'SL', updatePayload, adminId);
    
    expect(updatedPolicy.version).toBe(2);
    expect(updatedPolicy.annualAllowance).toBe(12);
    expect(updatedPolicy.isActive).toBe(true);

    // 3. Check old policy
    const oldPolicy = await LeavePolicyRepository.findByIdAndTenant(policy._id, orgId);
    expect(oldPolicy.isActive).toBe(false);
    expect(oldPolicy.effectiveTo).not.toBeNull();
  });
});
