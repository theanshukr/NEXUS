import connectDB from '#@/platform/database/db.js';
import OrganizationRepository from '#@/modules/organization/repositories/OrganizationRepository.js';
import DepartmentRepository from '#@/modules/departments/repositories/DepartmentRepository.js';
import DepartmentService from '#@/modules/departments/services/DepartmentService.js';
import UserRepository from '#@/modules/users/repositories/UserRepository.js';
import UserRoleRepository from '#@/modules/roles/repositories/UserRoleRepository.js';
import AuditLog from '#@/modules/audit/models/AuditLog.js';
import { seedDemoOrganization } from '../seed/seedDemoOrganization.js';
import { seedDepartments } from '../seed/seedDepartments.js';
import { seedRoles } from '../seed/seedRoles.js';
import { seedUsers } from '../seed/seedUsers.js';
import { printDepartmentTree } from './printDepartmentTree.js';
import { TenantIsolationError } from '#@/core/errors/AppError.js';
import logger from '#@/platform/logger/index.js';
import mongoose from 'mongoose';

/**
 * Automated verification suite for Enterprise Workforce Management Platform (Phase B / Phase C ready).
 * Validates hierarchy integrity, tenant isolation, RBAC role binding, and immutable audit logs.
 */
export async function verifyAll() {
  console.log('\n================================================================================');
  console.log('             NEXUSOPS ENTERPRISE PLATFORM AUTOMATED VERIFICATION SUITE          ');
  console.log('================================================================================\n');

  logger.info('Step 1: Provisioning enterprise tenant and seeding corporate hierarchy...');
  const org = await seedDemoOrganization();
  const orgId = org._id || org.id;
  const depts = await seedDepartments(org);
  const roles = await seedRoles(org);
  const users = await seedUsers(org, depts, roles);

  console.log('\n--- Step 2: Visualizing Enterprise Hierarchy Tree ---');
  await printDepartmentTree(orgId, { detailed: true });

  console.log('\n--- Step 3: Performing Automated Structural & Security Checks ---');
  let passedChecks = 0;
  let totalChecks = 0;

  function assertCheck(condition, name, details = '') {
    totalChecks++;
    if (condition) {
      passedChecks++;
      console.log(`[PASS] Check #${totalChecks}: ${name} ${details}`);
    } else {
      console.error(`[FAIL] Check #${totalChecks}: ${name} ${details}`);
      throw new Error(`Verification failed at Check #${totalChecks}: ${name}`);
    }
  }

  // 1. Hierarchy & Level Checks
  const beDept = await DepartmentRepository.findByCode('BE', orgId);
  const engDept = await DepartmentRepository.findByCode('ENG', orgId);
  assertCheck(beDept && beDept.level === 1, 'Sub-department level accuracy', `(BE level: ${beDept?.level})`);
  assertCheck(beDept.parentDepartmentId.toString() === engDept._id.toString(), 'Parent-child linkage integrity');
  assertCheck(beDept.ancestors.length === 1 && beDept.ancestors[0].code === 'ENG', 'Materialralized ancestors array integrity');

  // 2. Manager Assignment & Employee Tracking Check
  const elena = await UserRepository.findByEmailAndTenant('elena.rostova@nexusops.enterprise', orgId);
  assertCheck(engDept.managerUserId && engDept.managerUserId.toString() === elena._id.toString(), 'Department Manager assignment binding');
  assertCheck(beDept.cachedEmployeeCount >= 5, 'Denormalized cachedEmployeeCount simulation tracking', `(BE count: ${beDept.cachedEmployeeCount})`);

  // 3. RBAC Role Binding Check
  const ceoUser = await UserRepository.findByEmailAndTenant('ceo@nexusops.enterprise', orgId);
  const ceoBindings = await UserRoleRepository.find({ userId: ceoUser._id }, orgId);
  assertCheck(ceoBindings.length > 0, 'RBAC UserRole binding persistence');

  // 4. Zero-Trust Multi-Tenancy Isolation Check
  logger.info('Testing multi-tenant zero-trust isolation...');
  const subOrg = await OrganizationRepository.create({
    name: 'NexusOps Subsidiary',
    code: 'NEXUS_SUB',
    status: 'ACTIVE',
    slug: 'nexusops-sub'
  });
  const subOrgId = subOrg._id || subOrg.id;
  const subActor = { userId: new mongoose.Types.ObjectId() };
  await DepartmentService.createDepartment({
    code: 'SUB_ENG',
    name: 'Subsidiary Engineering',
    level: 0
  }, subActor, subOrgId);

  const subDeptsInMainOrg = await DepartmentRepository.find({ code: 'SUB_ENG' }, orgId);
  assertCheck(subDeptsInMainOrg.length === 0, 'Zero-trust tenant isolation (no cross-tenant data leak)');

  let tenantErrorThrown = false;
  try {
    await DepartmentRepository.find({ code: 'ENG' });
  } catch (err) {
    if (err instanceof TenantIsolationError || err.message.includes('organizationId is required')) {
      tenantErrorThrown = true;
    }
  }
  assertCheck(tenantErrorThrown, 'Fatal security violation on missing organizationId query scope');

  // 5. Immutable Audit Log Ledger Check
  logger.info('Verifying immutable audit compliance ledger...');
  const auditLogs = await AuditLog.find({ organizationId: orgId, action: 'DEPARTMENT_CREATED' });
  // Notice GEN is seeded via repository in tenant bootstrap; the 18 departments seeded via domain service generate audit logs.
  assertCheck(auditLogs.length >= 18, 'Audit log event generation compliance', `(Found ${auditLogs.length} logs)`);

  let auditMutationPrevented = false;
  try {
    const logItem = auditLogs[0];
    await AuditLog.updateOne({ _id: logItem._id }, { $set: { action: 'TAMPERED_ACTION' } });
  } catch (err) {
    if (err.message.includes('immutable') || err.message.includes('Audit logs cannot be modified')) {
      auditMutationPrevented = true;
    }
  }
  assertCheck(auditMutationPrevented, 'Tamper-evident AuditLog immutability enforcement');

  console.log('\n================================================================================');
  console.log(`    VERIFICATION SUMMARY: ${passedChecks}/${totalChecks} CHECKS PASSED SUCCESSFULLY (100%)    `);
  console.log('================================================================================\n');

  return { passed: passedChecks, total: totalChecks };
}

if (process.argv[1] && process.argv[1].endsWith('verifyAll.js')) {
  (async () => {
    const { connectWithFallback, disconnectWithFallback } = await import('../seed/dbFallback.js');
    try {
      await connectWithFallback();
      await verifyAll();
      await disconnectWithFallback();
      process.exit(0);
    } catch (err) {
      console.error('\n[FATAL] Verification suite failed:', err.message, err.stack);
      await disconnectWithFallback();
      process.exit(1);
    }
  })();
}

export default verifyAll;
