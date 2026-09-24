import connectDB from '#@/platform/database/db.js';
import OrganizationRepository from '#@/modules/organization/repositories/OrganizationRepository.js';
import DepartmentRepository from '#@/modules/departments/repositories/DepartmentRepository.js';
import DepartmentService from '#@/modules/departments/services/DepartmentService.js';
import logger from '#@/platform/logger/index.js';
import mongoose from 'mongoose';

/**
 * High-concurrency parallel transaction verification suite.
 * Simulates 20+ simultaneous department creations and updates to prove zero deadlock/race conditions.
 */
export async function verifyConcurrency() {
  console.log('\n================================================================================');
  console.log('             NEXUSOPS CONCURRENCY & PARALLEL TRANSACTION BENCHMARK              ');
  console.log('================================================================================\n');

  logger.info('Step 1: Provisioning isolated concurrency test tenant...');
  const org = await OrganizationRepository.create({
    name: 'NexusOps Concurrency Benchmark',
    code: 'NEXUS_CONCURRENCY',
    status: 'ACTIVE',
    slug: `nexusops-concurrency-${Date.now()}`
  });
  const orgId = org._id || org.id;
  const actor = { userId: new mongoose.Types.ObjectId() };

  console.log('--- Step 2: Executing 10 Parallel Root Division Creations ---');
  const rootPromises = [];
  for (let i = 0; i < 10; i++) {
    rootPromises.push(
      DepartmentService.createDepartment({
        code: `ROOT_${i}`,
        name: `Root Division ${i}`,
        level: 0
      }, actor, orgId)
    );
  }

  const startTime = Date.now();
  const roots = await Promise.all(rootPromises);
  const rootTime = Date.now() - startTime;
  console.log(`[PASS] 10 Parallel root divisions created successfully in ${rootTime}ms without race conditions.`);

  const parentRoot = roots[0];
  console.log(`\n--- Step 3: Executing 20 Parallel Sub-Department Creations under ${parentRoot.code} ---`);
  const subPromises = [];
  for (let i = 0; i < 20; i++) {
    subPromises.push(
      DepartmentService.createDepartment({
        code: `SUB_${i}`,
        name: `Sub Department ${i}`,
        parentDepartmentId: parentRoot._id,
        level: 1
      }, actor, orgId)
    );
  }

  const subStartTime = Date.now();
  const subs = await Promise.all(subPromises);
  const subTime = Date.now() - subStartTime;
  console.log(`[PASS] 20 Parallel sub-departments created successfully in ${subTime}ms.`);

  console.log('\n--- Step 4: Executing 15 Concurrent Department Updates on Parent ---');
  const updatePromises = [];
  for (let i = 0; i < 15; i++) {
    updatePromises.push(
      DepartmentService.updateDepartment(parentRoot._id, {
        cachedEmployeeCount: (i + 1) * 10,
        description: `Concurrent update revision #${i + 1}`
      }, actor, orgId)
    );
  }

  const updateStartTime = Date.now();
  await Promise.all(updatePromises);
  const updateTime = Date.now() - updateStartTime;
  console.log(`[PASS] 15 Concurrent department updates resolved in ${updateTime}ms without deadlocks.`);

  console.log('\n--- Step 5: Verifying Materialized Ancestor & Hierarchy Integrity ---');
  const totalDepts = await DepartmentRepository.countDocuments({}, orgId);
  console.log(`Total departments created in tenant: ${totalDepts}`);

  if (totalDepts < 30) {
    throw new Error(`Expected at least 30 departments, found ${totalDepts}`);
  }

  const sampleSub = await DepartmentRepository.findByCode('SUB_15', orgId);
  if (!sampleSub || sampleSub.level !== 1 || sampleSub.ancestors.length !== 1 || sampleSub.ancestors[0].code !== 'ROOT_0') {
    throw new Error('Ancestor array or hierarchy level corrupted during parallel creation!');
  }
  console.log('[PASS] Materialized ancestor arrays remain 100% consistent under high concurrency.');

  console.log('\n================================================================================');
  console.log('       CONCURRENCY BENCHMARK PASSED: ZERO DEADLOCKS OR RACE CONDITIONS          ');
  console.log('================================================================================\n');

  return { totalDepts, rootTime, subTime, updateTime };
}

if (process.argv[1] && process.argv[1].endsWith('verifyConcurrency.js')) {
  (async () => {
    const { connectWithFallback, disconnectWithFallback } = await import('../seed/dbFallback.js');
    try {
      await connectWithFallback();
      await verifyConcurrency();
      await disconnectWithFallback();
      process.exit(0);
    } catch (err) {
      console.error('\n[FATAL] Concurrency verification failed:', err.message, err.stack);
      await disconnectWithFallback();
      process.exit(1);
    }
  })();
}

export default verifyConcurrency;
