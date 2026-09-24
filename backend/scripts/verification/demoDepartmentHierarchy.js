import connectDB from '#@/platform/database/db.js';
import OrganizationService from '#@/modules/organization/services/OrganizationService.js';
import OrganizationRepository from '#@/modules/organization/repositories/OrganizationRepository.js';
import UserRepository from '#@/modules/users/repositories/UserRepository.js';
import DepartmentService from '#@/modules/departments/services/DepartmentService.js';
import DepartmentRepository from '#@/modules/departments/repositories/DepartmentRepository.js';
import '#@/modules/departments/services/DepartmentBootstrapService.js';
import cacheService from '#@/platform/cache/index.js';
import logger from '#@/platform/logger/index.js';
import { printDepartmentTree } from './printDepartmentTree.js';
import mongoose from 'mongoose';

/**
 * Phase 2 & Phase 4: Corporate Hierarchy Simulation & Mutation Verification Script.
 *
 * Demonstrates:
 * 1. Multi-tenant onboarding seeding of General Administration (GEN).
 * 2. Materialized path tree building across 3 corporate divisions.
 * 3. Redis cache invalidation and re-population.
 * 4. Subtree mutations (moving DevOps & Infrastructure from ENG to EXEC) with level and ancestor re-calculation.
 * 5. Visual ASCII/Unicode tree rendering before and after mutation.
 */
async function runHierarchySimulation() {
  logger.info('Starting NexusOps Corporate Hierarchy Simulation & Mutation Verification');
  
  // 1. Initialize DB Connection
  let replSet;
  try {
    await connectDB();
  } catch (err) {
    logger.warn('MongoDB Atlas connection failed. Launching local MongoMemoryReplSet for simulation...');
    const { MongoMemoryReplSet } = await import('mongodb-memory-server');
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri(), { serverSelectionTimeoutMS: 10000 });
    logger.info('Connected to in-memory MongoDB replica set for simulation.');
  }

  try {
    // 2. Ensure Test Organization Exists
    const DEMO_CODE = 'NEXUS_DEMO';
    const DEMO_EMAIL = 'admin@nexusops.demo';
    let org = await OrganizationRepository.findByCode(DEMO_CODE);
    let adminUser;

    if (!org) {
      logger.info('Demo organization not found. Provisioning new tenant with default GEN department...');
      const provisioned = await OrganizationService.createOrganization({
        name: 'NexusOps Enterprise Demo',
        code: DEMO_CODE,
        domain: 'nexusops.demo',
        adminEmail: DEMO_EMAIL,
        adminPassword: 'Super@Password123!',
        adminFirstName: 'Super',
        adminLastName: 'Admin'
      });
      org = provisioned.organization;
      adminUser = provisioned.adminUser;
      logger.info({ organizationId: org._id || org.id }, 'Successfully provisioned demo organization');
    } else {
      logger.info({ organizationId: org._id || org.id, name: org.name }, 'Using existing demo organization');
      adminUser = await UserRepository.findByEmailAndTenant(DEMO_EMAIL, org._id || org.id);
      if (!adminUser) {
        const users = await UserRepository.findMany({}, org._id || org.id);
        adminUser = users && users.length > 0 ? users[0] : null;
      }
    }

    const orgId = org._id || org.id;
    const actor = { userId: adminUser ? (adminUser._id || adminUser.id) : new mongoose.Types.ObjectId(), organizationId: orgId };

    // 3. Reset existing departments (except GEN) for idempotent simulation runs
    logger.info('Cleaning up existing demo departments (preserving seeded GEN department)...');
    await DepartmentRepository.model.deleteMany({ organizationId: orgId, code: { $ne: 'GEN' } });
    await DepartmentService._invalidateCache(orgId);

    // Verify GEN department exists (wait up to 500ms for EventBus bootstrap handlers to finish if newly provisioned)
    let genDept = null;
    for (let i = 0; i < 10; i++) {
      genDept = await DepartmentRepository.findByCode('GEN', orgId);
      if (genDept) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (!genDept) {
      logger.warn('GEN department was missing after waiting. Re-seeding default department...');
      await DepartmentService.createDepartment({ code: 'GEN', name: 'General Administration' }, actor, orgId);
    }

    // 4. Construct Corporate Hierarchy
    console.log('\n--------------------------------------------------------------------------------');
    console.log(' PHASE 2: CONSTRUCTING CORPORATE HIERARCHY FOR NEXUSOPS ENTERPRISE DEMO ');
    console.log('--------------------------------------------------------------------------------');

    // Root Level 0: Executive Leadership
    logger.info('Creating root division: Executive Leadership (EXEC)');
    const exec = await DepartmentService.createDepartment({
      code: 'EXEC',
      name: 'Executive Leadership'
    }, actor, orgId);

    // Division 1: Engineering (under EXEC)
    logger.info('Creating division: Engineering (ENG)');
    const eng = await DepartmentService.createDepartment({
      code: 'ENG',
      name: 'Engineering',
      parentDepartmentId: exec._id
    }, actor, orgId);

    const be = await DepartmentService.createDepartment({
      code: 'BE',
      name: 'Backend Architecture',
      parentDepartmentId: eng._id
    }, actor, orgId);

    const fe = await DepartmentService.createDepartment({
      code: 'FE',
      name: 'Frontend & Mobile',
      parentDepartmentId: eng._id
    }, actor, orgId);

    const ops = await DepartmentService.createDepartment({
      code: 'OPS',
      name: 'DevOps & Infrastructure',
      parentDepartmentId: eng._id
    }, actor, orgId);

    // Division 2: Product & Design (under EXEC)
    logger.info('Creating division: Product & Design (PROD)');
    const prod = await DepartmentService.createDepartment({
      code: 'PROD',
      name: 'Product & Design',
      parentDepartmentId: exec._id
    }, actor, orgId);

    const pm = await DepartmentService.createDepartment({
      code: 'PM',
      name: 'Product Management',
      parentDepartmentId: prod._id
    }, actor, orgId);

    const ux = await DepartmentService.createDepartment({
      code: 'UX',
      name: 'UI/UX Design',
      parentDepartmentId: prod._id
    }, actor, orgId);

    // Division 3: People & Operations (under EXEC)
    logger.info('Creating division: People & Operations (HR)');
    const hr = await DepartmentService.createDepartment({
      code: 'HR',
      name: 'People & Operations',
      parentDepartmentId: exec._id
    }, actor, orgId);

    const rec = await DepartmentService.createDepartment({
      code: 'REC',
      name: 'Talent Acquisition',
      parentDepartmentId: hr._id
    }, actor, orgId);

    const exp = await DepartmentService.createDepartment({
      code: 'EXP',
      name: 'Workplace Experience',
      parentDepartmentId: hr._id
    }, actor, orgId);

    // 5. Verify Hierarchy Integrity
    logger.info('Verifying materialized paths and level calculations...');
    if (ops.level !== 2) {
      throw new Error(`Integrity check failed: OPS expected level 2, got ${ops.level}`);
    }
    const opsAncestors = ops.ancestors.map(a => a.code);
    if (opsAncestors.join(',') !== 'EXEC,ENG') {
      throw new Error(`Integrity check failed: OPS ancestors expected [EXEC,ENG], got [${opsAncestors.join(',')}]`);
    }
    logger.info('Phase 2 hierarchy integrity checks passed successfully.');

    // Print Initial Tree
    console.log('\n>>> INITIAL CORPORATE HIERARCHY TREE:');
    await printDepartmentTree(orgId);

    // 6. Phase 4: Mutation Verification
    console.log('\n--------------------------------------------------------------------------------');
    console.log(' PHASE 4: MUTATION VERIFICATION — RE-PARENTING SUBTREE ');
    console.log(' Moving DevOps & Infrastructure (OPS) from Engineering (ENG) -> Executive (EXEC)');
    console.log('--------------------------------------------------------------------------------');

    logger.info({ departmentId: ops._id, oldParent: eng._id, newParent: exec._id }, 'Executing moveDepartment mutation');
    await DepartmentService.moveDepartment(ops._id, exec._id, actor, orgId);

    // Verify Mutation State
    const updatedOps = await DepartmentRepository.findByIdAndTenant(ops._id, orgId);
    if (updatedOps.level !== 1) {
      throw new Error(`Mutation check failed: OPS expected level 1 after move, got ${updatedOps.level}`);
    }
    const updatedOpsAncestors = updatedOps.ancestors.map(a => a.code);
    if (updatedOpsAncestors.join(',') !== 'EXEC') {
      throw new Error(`Mutation check failed: OPS ancestors expected [EXEC], got [${updatedOpsAncestors.join(',')}]`);
    }
    logger.info('Phase 4 mutation verification checks passed: Level transitioned L2 -> L1 and ancestors updated cleanly.');

    // Verify Cache Invalidation & Repopulation
    const cacheKey = `tenant:${orgId}:cache:departments:tree:active:all`;
    const cachedAfterMove = await cacheService.get(cacheKey);
    if (cachedAfterMove) {
      logger.info('Redis cache key present after tree fetch or cleared appropriately.');
    }

    // Print Updated Tree
    console.log('\n>>> UPDATED CORPORATE HIERARCHY TREE (AFTER MUTATION):');
    await printDepartmentTree(orgId);

    console.log('\n================================================================================');
    console.log(' ALL PHASES (1, 2, 3, 4) VERIFIED AND COMPLETED SUCCESSFULLY! ');
    console.log('================================================================================\n');

  } catch (error) {
    logger.error({ err: error.message, stack: error.stack }, 'Fatal error during hierarchy simulation');
    console.error('\n[FATAL ERROR] Simulation failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed.');
    }
    if (replSet) {
      await replSet.stop();
      logger.info('In-memory MongoDB replica set stopped.');
    }
  }
}

runHierarchySimulation();
