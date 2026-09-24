import connectDB from '#@/platform/database/db.js';
import DepartmentService from '#@/modules/departments/services/DepartmentService.js';
import DepartmentRepository from '#@/modules/departments/repositories/DepartmentRepository.js';
import UserRepository from '#@/modules/users/repositories/UserRepository.js';
import { seedDemoOrganization } from './seedDemoOrganization.js';
import logger from '#@/platform/logger/index.js';
import mongoose from 'mongoose';

/**
 * Seeds the exact corporate department hierarchy for an organization.
 * Enforces idempotency by checking existing department codes.
 *
 * Hierarchy:
 * - Executive Leadership (EXEC) -> Executive Office (CEO)
 * - Engineering (ENG) -> Backend (BE), Frontend (FE), DevOps (DEV), QA (QA), AI & Copilot (AI)
 * - Finance (FIN) -> Payroll Operations (PAY), Corporate Accounting (ACC)
 * - People & Operations (HR) -> Talent Acquisition (REC), Employee Success (SUC)
 * - Sales & Business Development (SALES)
 * - Marketing & Communications (MKT)
 * - General Operations (OPS)
 * - Legal & Compliance (LEG)
 * - General Administration (GEN) [Auto-seeded by bootstrap]
 */
export async function seedDepartments(org) {
  const orgId = org._id || org.id;
  logger.info({ organizationId: orgId }, 'Seeding corporate department hierarchy...');

  const adminUser = await UserRepository.findOne({}, orgId);
  const actor = { userId: adminUser ? adminUser._id : new mongoose.Types.ObjectId() };

  const departmentsMap = {};

  // Helper to create or retrieve department idempotently
  async function ensureDept(code, name, description, parentCode = null) {
    let dept = await DepartmentRepository.findByCode(code, orgId);
    if (dept) {
      logger.info({ code, id: dept._id }, `Department '${code}' already exists. Using existing record.`);
      departmentsMap[code] = dept;
      return dept;
    }

    const parentId = parentCode && departmentsMap[parentCode] ? departmentsMap[parentCode]._id : null;
    dept = await DepartmentService.createDepartment({
      code,
      name,
      description,
      parentDepartmentId: parentId
    }, actor, orgId);

    departmentsMap[code] = dept;
    return dept;
  }

  // 1. Root Divisions (Level 0)
  await ensureDept('EXEC', 'Executive Leadership', 'C-Suite executive leadership division');
  await ensureDept('ENG', 'Engineering', 'Core software engineering and product technology division');
  await ensureDept('FIN', 'Finance', 'Corporate accounting, financial planning, and payroll operations');
  await ensureDept('HR', 'People & Operations', 'Human resources, talent acquisition, and workplace experience');
  await ensureDept('SALES', 'Sales & Business Development', 'Global sales, partnerships, and revenue operations');
  await ensureDept('MKT', 'Marketing & Communications', 'Brand strategy, product marketing, and public relations');
  await ensureDept('OPS', 'General Operations', 'Internal business operations and logistics');
  await ensureDept('LEG', 'Legal & Compliance', 'Corporate counsel, regulatory compliance, and governance');

  // Check if GEN exists from bootstrap
  const genDept = await DepartmentRepository.findByCode('GEN', orgId);
  if (genDept) {
    departmentsMap['GEN'] = genDept;
  }

  // 2. Sub-Departments (Level 1 under EXEC)
  await ensureDept('CEO', 'Executive Office', 'Office of the Chief Executive Officer', 'EXEC');

  // 3. Sub-Departments (Level 1 under ENG)
  await ensureDept('BE', 'Backend Architecture', 'Distributed systems, database infrastructure, and core APIs', 'ENG');
  await ensureDept('FE', 'Frontend & Mobile', 'Web applications, iOS/Android clients, and design systems', 'ENG');
  await ensureDept('DEV', 'DevOps & Infrastructure', 'Cloud platforms, CI/CD pipelines, and site reliability', 'ENG');
  await ensureDept('QA', 'Quality Assurance', 'Automated testing, performance verification, and release quality', 'ENG');
  await ensureDept('AI', 'Artificial Intelligence & Copilot', 'LLM orchestration, autonomous agents, and AI workforce tools', 'ENG');

  // 4. Sub-Departments (Level 1 under FIN)
  await ensureDept('PAY', 'Payroll Operations', 'Employee compensation, tax deductions, and benefits administration', 'FIN');
  await ensureDept('ACC', 'Corporate Accounting', 'Financial reporting, auditing, and ledger management', 'FIN');

  // 5. Sub-Departments (Level 1 under HR)
  await ensureDept('REC', 'Talent Acquisition', 'Global recruitment, sourcing, and candidate experience', 'HR');
  await ensureDept('SUC', 'Employee Success', 'Onboarding, career development, and employee relations', 'HR');

  logger.info({ totalCount: Object.keys(departmentsMap).length }, 'Completed corporate department seeding.');
  return departmentsMap;
}

if (process.argv[1] && process.argv[1].endsWith('seedDepartments.js')) {
  (async () => {
    const { connectWithFallback, disconnectWithFallback } = await import('./dbFallback.js');
    try {
      await connectWithFallback();
      const org = await seedDemoOrganization();
      const depts = await seedDepartments(org);
      console.log(`Successfully seeded ${Object.keys(depts).length} departments.`);
      await disconnectWithFallback();
      process.exit(0);
    } catch (err) {
      console.error('Error seeding departments:', err.message, err.stack);
      await disconnectWithFallback();
      process.exit(1);
    }
  })();
}

export default seedDepartments;
