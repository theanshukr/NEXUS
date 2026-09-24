import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { startDb, clearDb, stopDb } from '../setup/db.js';
import DepartmentBootstrapService from '#@/modules/departments/services/DepartmentBootstrapService.js';
import DepartmentRepository from '#@/modules/departments/repositories/DepartmentRepository.js';
import OrganizationBootstrapRegistry from '#@/core/bootstrap/OrganizationBootstrapRegistry.js';
import EventBus from '#@/core/events/EventBus.js';
import EVENTS from '#@/core/constants/events/index.js';
import mongoose from 'mongoose';

describe('DepartmentBootstrapService – Layer 3 & Onboarding Seeding Tests', () => {
  const ORG_ID = new mongoose.Types.ObjectId();
  const ADMIN_ID = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    await startDb();
  });

  afterEach(async () => {
    await clearDb();
  });

  afterAll(async () => {
    await stopDb();
  });

  it('seeds default General Administration (GEN) department when absent', async () => {
    const created = await DepartmentBootstrapService.seedDefaultDepartment({
      organizationId: ORG_ID,
      adminUserId: ADMIN_ID
    });

    expect(created).toBeDefined();
    expect(created.code).toBe('GEN');
    expect(created.name).toBe('General Administration');
    expect(created.level).toBe(0);

    const count = await DepartmentRepository.countDocuments({ code: 'GEN' }, ORG_ID);
    expect(count).toBe(1);
  });

  it('is idempotent and does not create duplicate GEN departments on repeated execution', async () => {
    await DepartmentBootstrapService.seedDefaultDepartment({
      organizationId: ORG_ID,
      adminUserId: ADMIN_ID
    });

    const secondRun = await DepartmentBootstrapService.seedDefaultDepartment({
      organizationId: ORG_ID,
      adminUserId: ADMIN_ID
    });

    expect(secondRun).toBeDefined();
    expect(secondRun.code).toBe('GEN');

    const count = await DepartmentRepository.countDocuments({ code: 'GEN' }, ORG_ID);
    expect(count).toBe(1);
  });

  it('is registered in OrganizationBootstrapRegistry with appropriate priority', () => {
    const handlers = OrganizationBootstrapRegistry.getHandlers();
    const found = handlers.find(h => h.name === 'DepartmentBootstrapService');
    expect(found).toBeDefined();
    expect(found.priority).toBe(10);
  });

  it('is executed via EVENTS.TENANT.PROVISIONED event emission without calling service directly', async () => {
    const TEST_ORG = new mongoose.Types.ObjectId();
    const TEST_ADMIN = new mongoose.Types.ObjectId();

    let count = await DepartmentRepository.countDocuments({ code: 'GEN' }, TEST_ORG);
    expect(count).toBe(0);

    EventBus.emit(EVENTS.TENANT.PROVISIONED, {
      organizationId: TEST_ORG,
      adminUserId: TEST_ADMIN
    });

    // Wait for async event bus handler to complete transaction
    await new Promise(resolve => setTimeout(resolve, 150));

    count = await DepartmentRepository.countDocuments({ code: 'GEN' }, TEST_ORG);
    expect(count).toBe(1);

    const genDept = await DepartmentRepository.findByCode('GEN', TEST_ORG);
    expect(genDept.name).toBe('General Administration');
  });

  it('remains idempotent when EVENTS.TENANT.PROVISIONED is emitted multiple times', async () => {
    const TEST_ORG = new mongoose.Types.ObjectId();
    const TEST_ADMIN = new mongoose.Types.ObjectId();

    EventBus.emit(EVENTS.TENANT.PROVISIONED, {
      organizationId: TEST_ORG,
      adminUserId: TEST_ADMIN
    });
    await new Promise(resolve => setTimeout(resolve, 150));

    EventBus.emit(EVENTS.TENANT.PROVISIONED, {
      organizationId: TEST_ORG,
      adminUserId: TEST_ADMIN
    });
    await new Promise(resolve => setTimeout(resolve, 150));

    const count = await DepartmentRepository.countDocuments({ code: 'GEN' }, TEST_ORG);
    expect(count).toBe(1);
  });
});
