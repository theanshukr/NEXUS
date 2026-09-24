import RoleService from '#@/modules/roles/services/RoleService.js';
import RoleRepository from '#@/modules/roles/repositories/RoleRepository.js';
import UserRepository from '#@/modules/users/repositories/UserRepository.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';
import { seedDemoOrganization } from './seedDemoOrganization.js';
import logger from '#@/platform/logger/index.js';
import mongoose from 'mongoose';

/**
 * Seeds custom RBAC roles representing the enterprise hierarchy chain.
 * Enforces idempotency by checking existing role names.
 */
export async function seedRoles(org) {
  const orgId = org._id || org.id;
  logger.info({ organizationId: orgId }, 'Seeding custom enterprise RBAC roles...');

  const adminUser = await UserRepository.findOne({}, orgId);
  const actorContext = {
    userId: adminUser ? adminUser._id : new mongoose.Types.ObjectId(),
    organizationId: orgId
  };

  const rolesMap = {};

  // Retrieve existing roles (including system templates like Super Admin)
  const existingRoles = await RoleRepository.findActiveRoles(orgId);
  for (const r of existingRoles) {
    rolesMap[r.name] = r;
  }

  async function ensureRole(name, description, priority, permissions) {
    if (rolesMap[name]) {
      logger.info({ name, id: rolesMap[name]._id }, `Role '${name}' already exists. Using existing record.`);
      return rolesMap[name];
    }

    const created = await RoleService.createCustomRole({
      name,
      description,
      priority,
      permissions
    }, actorContext);

    rolesMap[name] = created;
    return created;
  }

  const allUserRead = [PERMISSIONS.USER.READ, PERMISSIONS.USER.READ_SELF];
  const allAttendanceApprove = [PERMISSIONS.ATTENDANCE.MARK, PERMISSIONS.ATTENDANCE.APPROVE];
  const allLeaveApprove = [PERMISSIONS.LEAVE.APPLY, PERMISSIONS.LEAVE.APPROVE];
  const allAi = [PERMISSIONS.AI.USE, PERMISSIONS.AI.EXECUTE_TOOL];
  const standardEmployeePerms = [PERMISSIONS.ATTENDANCE.MARK, PERMISSIONS.LEAVE.APPLY, PERMISSIONS.USER.READ_SELF, PERMISSIONS.AI.USE];

  await ensureRole('CEO', 'Chief Executive Officer with full domain oversight', 5, ['*']);
  await ensureRole('Engineering Director', 'Director of Engineering division', 15, [
    ...allUserRead, ...allAttendanceApprove, ...allLeaveApprove, ...allAi, PERMISSIONS.INVITE.CREATE
  ]);
  await ensureRole('Finance Director', 'Director of Finance and Payroll division', 15, [
    ...allUserRead, ...allAttendanceApprove, ...allLeaveApprove, ...allAi,
    PERMISSIONS.PAYROLL.RUN, PERMISSIONS.PAYROLL.LOCK, PERMISSIONS.PAYROLL.VIEW_SALARY
  ]);
  await ensureRole('HR Director', 'Director of People and Talent Acquisition division', 15, [
    ...allUserRead, ...allAttendanceApprove, ...allLeaveApprove, ...allAi,
    PERMISSIONS.INVITE.CREATE, PERMISSIONS.INVITE.REVOKE, PERMISSIONS.ROLE.READ, PERMISSIONS.ROLE.ASSIGN
  ]);

  await ensureRole('Backend Manager', 'Engineering Manager for Backend Architecture', 25, [
    ...allUserRead, ...allAttendanceApprove, ...allLeaveApprove, ...allAi
  ]);
  await ensureRole('Frontend Manager', 'Engineering Manager for Frontend & Mobile', 25, [
    ...allUserRead, ...allAttendanceApprove, ...allLeaveApprove, ...allAi
  ]);
  await ensureRole('QA Manager', 'Engineering Manager for Quality Assurance', 25, [
    ...allUserRead, ...allAttendanceApprove, ...allLeaveApprove, ...allAi
  ]);

  await ensureRole('Senior Engineer', 'Senior technical software engineer', 40, standardEmployeePerms);
  await ensureRole('Software Engineer', 'Standard technical software engineer', 60, standardEmployeePerms);
  await ensureRole('Junior Engineer', 'Junior software engineer', 75, standardEmployeePerms);
  await ensureRole('Intern', 'Engineering or operational intern', 90, standardEmployeePerms);

  await ensureRole('Recruiter', 'Talent acquisition specialist', 40, [
    ...standardEmployeePerms, PERMISSIONS.USER.READ, PERMISSIONS.INVITE.CREATE
  ]);
  await ensureRole('Sales Executive', 'Sales and business development specialist', 60, standardEmployeePerms);
  await ensureRole('Marketing Executive', 'Marketing and brand communications specialist', 60, standardEmployeePerms);

  logger.info({ totalRoles: Object.keys(rolesMap).length }, 'Completed RBAC role seeding.');
  return rolesMap;
}

if (process.argv[1] && process.argv[1].endsWith('seedRoles.js')) {
  (async () => {
    const { connectWithFallback, disconnectWithFallback } = await import('./dbFallback.js');
    try {
      await connectWithFallback();
      const org = await seedDemoOrganization();
      const roles = await seedRoles(org);
      console.log(`Successfully seeded ${Object.keys(roles).length} custom RBAC roles.`);
      await disconnectWithFallback();
      process.exit(0);
    } catch (err) {
      console.error('Error seeding roles:', err.message, err.stack);
      await disconnectWithFallback();
      process.exit(1);
    }
  })();
}

export default seedRoles;
