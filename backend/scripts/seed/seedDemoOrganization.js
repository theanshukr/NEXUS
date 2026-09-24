import connectDB from '#@/platform/database/db.js';
import OrganizationService from '#@/modules/organization/services/OrganizationService.js';
import OrganizationRepository from '#@/modules/organization/repositories/OrganizationRepository.js';
import DepartmentRepository from '#@/modules/departments/repositories/DepartmentRepository.js';
import '#@/modules/departments/services/DepartmentBootstrapService.js';
import logger from '#@/platform/logger/index.js';
import mongoose from 'mongoose';

/**
 * Provisions or retrieves the NexusOps Enterprise demo organization ('NEXUS_ENT').
 * Ensures idempotent execution and waits for asynchronous EventBus bootstrap handlers to complete.
 */
export async function seedDemoOrganization() {
  const code = 'NEXUS_ENT';
  let org = await OrganizationRepository.findByCode(code);

  if (org) {
    logger.info({ organizationId: org._id, code: org.code }, 'NexusOps Enterprise organization already exists. Using existing tenant.');
    return org;
  }

  logger.info({ code }, 'Provisioning new NexusOps Enterprise organization...');
  const result = await OrganizationService.createOrganization({
    name: 'NexusOps Enterprise',
    code,
    domain: 'nexusops.enterprise',
    adminEmail: 'ceo@nexusops.enterprise',
    adminPassword: 'Admin@1234',
    adminFirstName: 'Arthur',
    adminLastName: 'Pendleton',
    timezone: 'UTC',
    currency: 'USD'
  });

  org = await OrganizationRepository.findById(result.organization.id);

  // Wait for asynchronous EventBus bootstrap handler to finish seeding default GEN department
  logger.info('Waiting for asynchronous EventBus bootstrap seeding of default GEN department...');
  let genDept = null;
  for (let i = 0; i < 20; i++) {
    genDept = await DepartmentRepository.findByCode('GEN', org._id);
    if (genDept) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  if (!genDept) {
    logger.warn({ organizationId: org._id }, 'Warning: Default GEN department not found after waiting 5 seconds.');
  } else {
    logger.info({ departmentId: genDept._id }, 'Default GEN department confirmed.');
  }

  return org;
}

if (process.argv[1] && process.argv[1].endsWith('seedDemoOrganization.js')) {
  (async () => {
    const { connectWithFallback, disconnectWithFallback } = await import('./dbFallback.js');
    try {
      await connectWithFallback();
      const org = await seedDemoOrganization();
      console.log('Successfully seeded organization:', { id: org._id, name: org.name, code: org.code });
      await disconnectWithFallback();
      process.exit(0);
    } catch (err) {
      console.error('Error seeding organization:', err.message);
      await disconnectWithFallback();
      process.exit(1);
    }
  })();
}

export default seedDemoOrganization;
