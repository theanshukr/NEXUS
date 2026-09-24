import { MongoMemoryServer } from 'mongodb-memory-server';

async function startLocalEnv() {
  console.log('Starting MongoDB Memory Server (Standalone)...');
  
  const server = await MongoMemoryServer.create();
  let uri = server.getUri();
  uri = uri.includes('?') ? `${uri}&retryWrites=false` : `${uri}?retryWrites=false`;
  
  console.log(`Memory Server started at: ${uri}`);
  
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = 'development';
  process.env.PORT = '5001';

  // Connect to DB in-process
  const { default: connectDB } = await import('../src/platform/database/db.js');
  await connectDB();

  console.log('Seeding standard dev organization and users in-process...');
  const { default: OrganizationService } = await import('../src/modules/organization/services/OrganizationService.js');
  const { default: RoleService } = await import('../src/modules/roles/services/RoleService.js');
  const { default: UserRepository } = await import('../src/modules/users/repositories/UserRepository.js');
  const { default: UserRoleRepository } = await import('../src/modules/roles/repositories/UserRoleRepository.js');
  const { hashPassword } = await import('../src/core/utils/crypto.js');
  const { default: mongoose } = await import('mongoose');

  // Models for Recruitment Seeding
  const { default: Department } = await import('../src/modules/departments/models/Department.js');
  const { default: JobRequisition } = await import('../src/modules/recruitment/models/JobRequisition.js');
  const { default: JobPosting } = await import('../src/modules/recruitment/models/JobPosting.js');
  const { default: Candidate } = await import('../src/modules/candidate/models/Candidate.js');
  const { default: JobApplication } = await import('../src/modules/recruitment/models/JobApplication.js');
  const { default: ApplicationWorkflowInstance } = await import('../src/modules/recruitment/models/ApplicationWorkflowInstance.js');
  const { default: ApplicationStageInstance } = await import('../src/modules/recruitment/models/ApplicationStageInstance.js');

  const code = 'DEV';
  const Organization = mongoose.model('Organization');
  let existingOrg = await Organization.findOne({ code });
  if (!existingOrg) {
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
      }
    }
  }

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

  // Seed recruitment demo data
  const hrUser = await UserRepository.findByEmailAndTenant('hr@dev.com', org._id);
  let req = await JobRequisition.findOne({ jobCode: 'REQ-ENG-001', organizationId: org._id });
  if (!req && hrUser) {
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

    let posting = await JobPosting.create({
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

    let candidate = await Candidate.create({
      organizationId: org._id,
      email: 'priya@example.com',
      firstName: 'Priya',
      lastName: 'Sharma',
      phone: '+1 555-0123',
      passwordHash: passwordHash
    });

    let appDoc = await JobApplication.create({
      organizationId: org._id,
      jobPostingId: posting._id,
      candidateId: candidate._id,
      applicationNumber: 'APP-1001',
      status: 'APPLIED',
      source: { type: 'CAREERS_PORTAL', reference: 'Website' },
      expectedSalary: 155000,
      submittedResumeDocumentId: new mongoose.Types.ObjectId()
    });

    const stages = [
      { name: 'Sourced', type: 'SCREENING', order: 1 },
      { name: 'Technical Round', type: 'INTERVIEW', order: 2 },
      { name: 'HR Round', type: 'INTERVIEW', order: 3 },
      { name: 'Offer Extended', type: 'OFFER', order: 4 },
      { name: 'Hired', type: 'SCREENING', order: 5 }
    ];
    const stageIds = stages.map(() => new mongoose.Types.ObjectId());

    const workflow = await ApplicationWorkflowInstance.create({
      applicationId: appDoc._id,
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

    appDoc.workflowInstanceId = workflow._id;
    await appDoc.save();

    const stageInstances = stages.map((s, i) => ({
      workflowInstanceId: workflow._id,
      applicationId: appDoc._id,
      organizationId: org._id,
      stageId: stageIds[i].toString(),
      order: s.order,
      status: i === 0 ? 'IN_PROGRESS' : 'PENDING'
    }));
    await ApplicationStageInstance.insertMany(stageInstances);
  }

  console.log('✅ Dev Org, Users and Demo Recruitment Data Seeded successfully!');

  // Start Express HTTP listening server
  console.log('Starting backend server on port 5001...');
  const { default: app } = await import('../src/app.js');
  app.listen(5001, () => {
    console.log('🚀 HTTP Server listening on port 5001');
  });
}

startLocalEnv().catch(err => {
  console.error('Fatal startLocalEnv error:', err);
  process.exit(1);
});
