import UserRepository from '#@/modules/users/repositories/UserRepository.js';
import UserRoleRepository from '#@/modules/roles/repositories/UserRoleRepository.js';
import DepartmentService from '#@/modules/departments/services/DepartmentService.js';
import { hashPassword } from '#@/core/utils/crypto.js';
import { seedDemoOrganization } from './seedDemoOrganization.js';
import { seedDepartments } from './seedDepartments.js';
import { seedRoles } from './seedRoles.js';
import logger from '#@/platform/logger/index.js';
import mongoose from 'mongoose';

/**
 * Seeds ~40 realistic enterprise users across corporate departments and RBAC roles.
 * Maps department managers and sets cachedEmployeeCount on Department records.
 */
export async function seedUsers(org, depts, roles) {
  const orgId = org._id || org.id;
  logger.info({ organizationId: orgId }, 'Seeding ~40 realistic enterprise users...');

  const adminUser = await UserRepository.findOne({}, orgId);
  const actor = { userId: adminUser ? adminUser._id : new mongoose.Types.ObjectId() };

  const defaultPasswordHash = await hashPassword('SecureSeedPassword123!');
  const usersMap = {};
  const deptEmployeeCounts = {};
  const deptManagers = {};

  async function ensureUser(email, firstName, lastName, roleName, deptCode, isManager = false) {
    let user = await UserRepository.findByEmailAndTenant(email, orgId);
    if (!user) {
      user = await UserRepository.createScoped({
        email: email.toLowerCase().trim(),
        passwordHash: defaultPasswordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        status: 'ACTIVE',
        lastLoginAt: new Date()
      }, orgId);
      logger.info({ email, userId: user._id }, 'Created new employee user');
    }

    // Assign Role
    const role = roles[roleName] || roles['Software Engineer'];
    if (role) {
      const existingBinding = await UserRoleRepository.findOne({ userId: user._id, roleId: role._id }, orgId);
      if (!existingBinding) {
        await UserRoleRepository.createScoped({
          userId: user._id,
          roleId: role._id,
          assignedBy: actor.userId
        }, orgId);
      }
    }

    // Track department simulation mapping
    if (deptCode && depts[deptCode]) {
      deptEmployeeCounts[deptCode] = (deptEmployeeCounts[deptCode] || 0) + 1;
      if (isManager || !deptManagers[deptCode]) {
        deptManagers[deptCode] = user._id;
      }
    }

    usersMap[email] = user;
    return user;
  }

  // 1. Executive Office (CEO)
  await ensureUser('ceo@nexusops.enterprise', 'Arthur', 'Pendleton', 'CEO', 'CEO', true);
  await ensureUser('coo@nexusops.enterprise', 'Victoria', 'Sterling', 'Super Admin', 'EXEC');

  // 2. Engineering Division (ENG, BE, FE, DEV, QA, AI)
  await ensureUser('elena.rostova@nexusops.enterprise', 'Elena', 'Rostova', 'Engineering Director', 'ENG', true);
  
  // Backend (BE)
  await ensureUser('marcus.vance@nexusops.enterprise', 'Marcus', 'Vance', 'Backend Manager', 'BE', true);
  await ensureUser('lucas.wright@nexusops.enterprise', 'Lucas', 'Wright', 'Senior Engineer', 'BE');
  await ensureUser('chloe.bennett@nexusops.enterprise', 'Chloe', 'Bennett', 'Senior Engineer', 'BE');
  await ensureUser('trent.miller@nexusops.enterprise', 'Trent', 'Miller', 'Software Engineer', 'BE');
  await ensureUser('amara.patel@nexusops.enterprise', 'Amara', 'Patel', 'Software Engineer', 'BE');
  await ensureUser('jake.sullivan@nexusops.enterprise', 'Jake', 'Sullivan', 'Junior Engineer', 'BE');
  await ensureUser('mia.zhang@nexusops.enterprise', 'Mia', 'Zhang', 'Intern', 'BE');

  // Frontend (FE)
  await ensureUser('sarah.lin@nexusops.enterprise', 'Sarah', 'Lin', 'Frontend Manager', 'FE', true);
  await ensureUser('daniel.foster@nexusops.enterprise', 'Daniel', 'Foster', 'Senior Engineer', 'FE');
  await ensureUser('hannah.reed@nexusops.enterprise', 'Hannah', 'Reed', 'Software Engineer', 'FE');
  await ensureUser('oliver.cohen@nexusops.enterprise', 'Oliver', 'Cohen', 'Software Engineer', 'FE');
  await ensureUser('lily.morris@nexusops.enterprise', 'Lily', 'Morris', 'Junior Engineer', 'FE');
  await ensureUser('ethan.hunt@nexusops.enterprise', 'Ethan', 'Hunt', 'Intern', 'FE');

  // DevOps & QA & AI
  await ensureUser('nathan.drake@nexusops.enterprise', 'Nathan', 'Drake', 'Senior Engineer', 'DEV', true);
  await ensureUser('samuel.colt@nexusops.enterprise', 'Samuel', 'Colt', 'Software Engineer', 'DEV');
  await ensureUser('david.kim@nexusops.enterprise', 'David', 'Kim', 'QA Manager', 'QA', true);
  await ensureUser('grace.hopper@nexusops.enterprise', 'Grace', 'Hopper', 'Senior Engineer', 'QA');
  await ensureUser('ada.lovelace@nexusops.enterprise', 'Ada', 'Lovelace', 'Senior Engineer', 'AI', true);
  await ensureUser('alan.turing@nexusops.enterprise', 'Alan', 'Turing', 'Software Engineer', 'AI');

  // 3. Finance Division (FIN, PAY, ACC)
  await ensureUser('victor.thorne@nexusops.enterprise', 'Victor', 'Thorne', 'Finance Director', 'FIN', true);
  await ensureUser('claire.underwood@nexusops.enterprise', 'Claire', 'Underwood', 'Finance Executive', 'PAY', true);
  await ensureUser('frank.underwood@nexusops.enterprise', 'Frank', 'Underwood', 'Finance Executive', 'PAY');
  await ensureUser('skyler.white@nexusops.enterprise', 'Skyler', 'White', 'Finance Executive', 'ACC', true);
  await ensureUser('saul.goodman@nexusops.enterprise', 'Saul', 'Goodman', 'Finance Executive', 'ACC');

  // 4. People & Operations Division (HR, REC, SUC)
  await ensureUser('rachel.green@nexusops.enterprise', 'Rachel', 'Green', 'HR Director', 'HR', true);
  await ensureUser('monica.geller@nexusops.enterprise', 'Monica', 'Geller', 'HR Manager', 'REC', true);
  await ensureUser('phoebe.buffay@nexusops.enterprise', 'Phoebe', 'Buffay', 'Recruiter', 'REC');
  await ensureUser('ross.geller@nexusops.enterprise', 'Ross', 'Geller', 'Recruiter', 'REC');
  await ensureUser('chandler.bing@nexusops.enterprise', 'Chandler', 'Bing', 'HR Manager', 'SUC', true);
  await ensureUser('joey.tribbiani@nexusops.enterprise', 'Joey', 'Tribbiani', 'Recruiter', 'SUC');

  // 5. Sales & Business Development (SALES)
  await ensureUser('michael.scott@nexusops.enterprise', 'Michael', 'Scott', 'Sales Executive', 'SALES', true);
  await ensureUser('jim.halpert@nexusops.enterprise', 'Jim', 'Halpert', 'Sales Executive', 'SALES');
  await ensureUser('dwight.schrute@nexusops.enterprise', 'Dwight', 'Schrute', 'Sales Executive', 'SALES');
  await ensureUser('pam.beesly@nexusops.enterprise', 'Pam', 'Beesly', 'Sales Executive', 'SALES');

  // 6. Marketing & Operations & Legal (MKT, OPS, LEG)
  await ensureUser('don.draper@nexusops.enterprise', 'Don', 'Draper', 'Marketing Executive', 'MKT', true);
  await ensureUser('peggy.olson@nexusops.enterprise', 'Peggy', 'Olson', 'Marketing Executive', 'MKT');
  await ensureUser('ron.swanson@nexusops.enterprise', 'Ron', 'Swanson', 'Department Manager', 'OPS', true);
  await ensureUser('leslie.knope@nexusops.enterprise', 'Leslie', 'Knope', 'Department Manager', 'OPS');
  await ensureUser('harvey.specter@nexusops.enterprise', 'Harvey', 'Specter', 'Super Admin', 'LEG', true);
  await ensureUser('mike.ross@nexusops.enterprise', 'Mike', 'Ross', 'Senior Engineer', 'LEG');

  // Update Departments with managerUserId and cachedEmployeeCount
  logger.info('Updating department manager assignments and cached employee counts...');
  for (const [code, dept] of Object.entries(depts)) {
    const managerId = deptManagers[code] || dept.managerUserId || null;
    const count = deptEmployeeCounts[code] || 0;
    
    await DepartmentService.updateDepartment(dept._id, {
      managerUserId: managerId,
      cachedEmployeeCount: count
    }, actor, orgId);
  }

  logger.info({ totalUsers: Object.keys(usersMap).length }, 'Completed enterprise user seeding and department mapping.');
  return usersMap;
}

if (process.argv[1] && process.argv[1].endsWith('seedUsers.js')) {
  (async () => {
    const { connectWithFallback, disconnectWithFallback } = await import('./dbFallback.js');
    try {
      await connectWithFallback();
      const org = await seedDemoOrganization();
      const depts = await seedDepartments(org);
      const roles = await seedRoles(org);
      const users = await seedUsers(org, depts, roles);
      console.log(`Successfully seeded ${Object.keys(users).length} realistic enterprise users.`);
      await disconnectWithFallback();
      process.exit(0);
    } catch (err) {
      console.error('Error seeding users:', err.message, err.stack);
      await disconnectWithFallback();
      process.exit(1);
    }
  })();
}

export default seedUsers;
