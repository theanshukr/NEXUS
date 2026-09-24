import connectDB from '#@/platform/database/db.js';
import OrganizationService from '#@/modules/organization/services/OrganizationService.js';
import OrganizationRepository from '#@/modules/organization/repositories/OrganizationRepository.js';
import DepartmentRepository from '#@/modules/departments/repositories/DepartmentRepository.js';
import UserRepository from '#@/modules/users/repositories/UserRepository.js';
import UserRoleRepository from '#@/modules/roles/repositories/UserRoleRepository.js';
import DepartmentService from '#@/modules/departments/services/DepartmentService.js';
import { hashPassword } from '#@/core/utils/crypto.js';
import logger from '#@/platform/logger/index.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

export async function seedVektorFlow() {
  const code = 'VFK';
  let org = await OrganizationRepository.findByCode(code);

  if (org) {
    logger.info({ organizationId: org._id, code: org.code }, 'VektorFlow Labs already exists.');
    return org;
  }

  logger.info({ code }, 'Provisioning VektorFlow Labs...');
  const result = await OrganizationService.createOrganization({
    name: 'VektorFlow Labs Private Limited',
    code,
    domain: 'vektorflow.ai',
    adminEmail: 'rajesh.sharma@vektorflow.ai',
    adminPassword: 'Admin@1234',
    adminFirstName: 'Rajesh',
    adminLastName: 'Sharma',
    timezone: 'Asia/Kolkata',
    currency: 'INR'
  });

  org = await OrganizationRepository.findById(result.organization.id);
  const orgId = org._id;

  // Wait for asynchronous EventBus bootstrap handler to finish seeding default GEN department
  let genDept = null;
  for (let i = 0; i < 20; i++) {
    genDept = await DepartmentRepository.findByCode('GEN', orgId);
    if (genDept) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  // Read JSON
  const dataPath = path.resolve('../frontend/src/data/vektorflow_data.json');
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const vData = JSON.parse(rawData);

  // Departments
  const actor = { userId: org.ownerId };
  const deptMap = {};
  for (const dName of vData.company.departments) {
    const dCode = dName.substring(0, 3).toUpperCase();
    const existing = await DepartmentRepository.findByCode(dCode, orgId);
    if (!existing) {
      const parentId = genDept ? genDept._id : null;
      const d = await DepartmentService.createDepartment({
        name: dName,
        code: dCode,
        parentDepartmentId: parentId,
        description: `${dName} Division`
      }, actor, orgId);
      deptMap[dName] = d._id;
    } else {
      deptMap[dName] = existing._id;
    }
  }

  // Users
  const defaultPasswordHash = await hashPassword('Admin@1234');

  // Need roles
  // Creating a simple map, defaulting to GEN if missing
  for (const emp of vData.employees) {
    const { email, firstName, lastName, role, department } = emp.personalDetails;
    if (email === 'rajesh.sharma@vektorflow.ai') continue; // Created during org creation

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
      logger.info({ email }, 'Created user');
    }
  }

  return org;
}

if (process.argv[1] && process.argv[1].endsWith('seedVektorFlow.js')) {
  (async () => {
    const { connectWithFallback, disconnectWithFallback } = await import('./dbFallback.js');
    try {
      await connectWithFallback();
      const org = await seedVektorFlow();
      console.log('Successfully seeded organization:', org.name);
      await disconnectWithFallback();
      process.exit(0);
    } catch (err) {
      console.error('Error seeding organization:', err.message);
      await disconnectWithFallback();
      process.exit(1);
    }
  })();
}
export default seedVektorFlow;
