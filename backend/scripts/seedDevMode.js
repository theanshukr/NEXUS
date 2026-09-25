import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import OrganizationService from '../src/modules/organization/services/OrganizationService.js';
import RoleService from '../src/modules/roles/services/RoleService.js';
import UserRepository from '../src/modules/users/repositories/UserRepository.js';
import UserRoleRepository from '../src/modules/roles/repositories/UserRoleRepository.js';
import { hashPassword } from '../src/core/utils/crypto.js';
import { connectDB } from '../src/platform/database/db.js';

// Models for Recruitment Seeding
import Department from '../src/modules/departments/models/Department.js';
import JobRequisition from '../src/modules/recruitment/models/JobRequisition.js';
import JobPosting from '../src/modules/recruitment/models/JobPosting.js';
import Candidate from '../src/modules/candidate/models/Candidate.js';
import JobApplication from '../src/modules/recruitment/models/JobApplication.js';
import ApplicationWorkflowInstance from '../src/modules/recruitment/models/ApplicationWorkflowInstance.js';
import ApplicationStageInstance from '../src/modules/recruitment/models/ApplicationStageInstance.js';
import { seedNexusIndianWorkforce } from '../src/modules/nexus/seeders/seedNexusWorkforce.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const seedDevMode = async () => {
  try {
    await connectDB();
    console.log('🌱 Connected to database for Dev Mode Seeding...');

    const code = 'DEV';
    
    // Drop existing dev org if it exists
    const Organization = mongoose.model('Organization');
    const existingOrg = await Organization.findOne({ code });
    if (existingOrg) {
        console.log(`⚠️  Found existing Dev Org (${existingOrg._id}). Proceeding without recreating the org...`);
    } else {
        console.log('🏢 Provisioning Dev Corp Organization...');
        await OrganizationService.createOrganization({
            name: 'Dev Corp',
            code: 'DEV',
            domain: 'dev.com',
            adminFirstName: 'Super',
            adminLastName: 'Admin',
            adminEmail: 'admin@dev.com',
            adminPassword: 'Dev@1234'
        });
    }

    const org = await Organization.findOne({ code: 'DEV' });
    const roles = await RoleService.getRoles(org._id);
    const passwordHash = await hashPassword('Dev@1234');

    const usersToCreate = [
      { email: 'hr@dev.com', firstName: 'HR', lastName: 'Manager', roleName: 'HR Manager' },
      { email: 'finance@dev.com', firstName: 'Finance', lastName: 'Executive', roleName: 'Finance Executive' },
      { email: 'it@dev.com', firstName: 'IT', lastName: 'Admin', roleName: 'Administrator' },
      { email: 'employee@dev.com', firstName: 'Standard', lastName: 'Employee', roleName: 'Standard Employee' }
    ];

    for (const userData of usersToCreate) {
      const existingUser = await UserRepository.findByEmailAndTenant(userData.email, org._id);
      if (!existingUser) {
        console.log(`👤 Creating user: ${userData.email} (${userData.roleName})`);
        
        const user = await UserRepository.createScoped({
          email: userData.email,
          passwordHash,
          firstName: userData.firstName,
          lastName: userData.lastName,
          status: 'ACTIVE'
        }, org._id);

        const role = roles.find(r => r.name === userData.roleName);
        if (role) {
          await UserRoleRepository.createScoped({
            userId: user._id,
            roleId: role._id,
            assignedBy: user._id
          }, org._id);
        } else {
          console.error(`❌ Role ${userData.roleName} not found!`);
        }
      } else {
        console.log(`✅ User ${userData.email} already exists.`);
      }
    }

    console.log('📈 Seeding Dev Recruitment Data...');
    
    // Seed Department
    let engineeringDept = await Department.findOne({ code: 'ENG', organizationId: org._id });
    if (!engineeringDept) {
      engineeringDept = await Department.create({
        organizationId: org._id,
        code: 'ENG',
        name: 'Engineering',
        level: 1
      });
    }

    // Identify hr and employee
    const hrUser = await UserRepository.findByEmailAndTenant('hr@dev.com', org._id);
    const employeeUser = await UserRepository.findByEmailAndTenant('employee@dev.com', org._id);

    // Seed Requisition
    let req = await JobRequisition.findOne({ jobCode: 'REQ-ENG-001', organizationId: org._id });
    if (!req) {
      req = await JobRequisition.create({
        organizationId: org._id,
        jobCode: 'REQ-ENG-001',
        departmentId: engineeringDept._id,
        reportingManagerId: hrUser._id,
        title: 'Senior Backend Engineer',
        description: 'Design and build scalable backend systems.',
        location: 'Remote',
        employmentType: 'FULL_TIME',
        workMode: 'REMOTE',
        minimumExperienceYears: 5,
        maximumExperienceYears: 8,
        salary: { min: 140000, max: 160000, currency: 'USD', period: 'YEARLY' },
        openPositions: 1,
        createdBy: hrUser._id,
        workflowStatus: 'ACTIVE',
        approvalStatus: 'APPROVED'
      });
    }

    // Seed Posting
    let posting = await JobPosting.findOne({ jobRequisitionId: req._id, organizationId: org._id });
    if (!posting) {
      posting = await JobPosting.create({
        organizationId: org._id,
        jobRequisitionId: req._id,
        title: 'Senior Backend Engineer',
        slug: 'senior-backend-engineer',
        location: 'Remote',
        department: 'Engineering',
        workMode: 'REMOTE',
        employmentType: 'FULL_TIME',
        description: 'Design and build scalable backend systems.',
        status: 'PUBLISHED',
        publishedAt: new Date()
      });
    }

    // Seed Candidate
    let candidate = await Candidate.findOne({ email: 'priya@example.com', organizationId: org._id });
    if (!candidate) {
      candidate = await Candidate.create({
        organizationId: org._id,
        email: 'priya@example.com',
        firstName: 'Priya',
        lastName: 'Sharma',
        phone: '+1 555-0123',
        passwordHash: passwordHash
      });
    }

    // Seed Application
    let app = await JobApplication.findOne({ candidateId: candidate._id, jobPostingId: posting._id });
    if (!app) {
      app = await JobApplication.create({
        organizationId: org._id,
        jobPostingId: posting._id,
        candidateId: candidate._id,
        applicationNumber: 'APP-1001',
        status: 'APPLIED',
        source: { type: 'CAREERS_PORTAL', reference: 'Website' },
        expectedSalary: 155000,
        submittedResumeDocumentId: new mongoose.Types.ObjectId()
      });

      // Stages
      const stages = [
        { name: 'Sourced', type: 'SCREENING', order: 1 },
        { name: 'Technical Round', type: 'INTERVIEW', order: 2 },
        { name: 'HR Round', type: 'INTERVIEW', order: 3 },
        { name: 'Offer Extended', type: 'OFFER', order: 4 },
        { name: 'Hired', type: 'SCREENING', order: 5 } // Just using SCREENING to bypass enum if HIRED doesn't exist in stage types
      ];

      const stageIds = stages.map(() => new mongoose.Types.ObjectId());

      // Workflow Instance
      const workflow = await ApplicationWorkflowInstance.create({
        applicationId: app._id,
        organizationId: org._id,
        candidateId: candidate._id,
        workflowSnapshot: stages.map((s, i) => ({
          _id: stageIds[i],
          name: s.name,
          type: s.type,
          order: s.order
        })),
        currentStageId: stageIds[0]
      });

      app.workflowInstanceId = workflow._id;
      await app.save();

      // Stage Instances
      const stageInstances = stages.map((s, i) => ({
        workflowInstanceId: workflow._id,
        applicationId: app._id,
        organizationId: org._id,
        stageId: stageIds[i].toString(),
        order: s.order,
        status: i === 0 ? 'IN_PROGRESS' : 'PENDING'
      }));

      await ApplicationStageInstance.insertMany(stageInstances);
    }

    // Seed Nexus Indian Engineering Workforce Profiles
    console.log('🇮🇳 Seeding Nexus Indian Engineering Workforce Profiles...');
    await seedNexusIndianWorkforce(org._id);

    console.log('✅ Dev Mode Seeding Complete!');
    return;
  } catch (error) {
    console.error('❌ Seeding Failed:', error);
    throw error;
  }
};

export { seedDevMode };
// Only run directly if called from CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDevMode().then(() => process.exit(0)).catch(() => process.exit(1));
}
