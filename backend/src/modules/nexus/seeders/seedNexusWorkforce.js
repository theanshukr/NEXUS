import mongoose from 'mongoose';
import Organization from '../../organization/models/Organization.js';
import Department from '../../departments/models/Department.js';
import Designation from '../../organization/models/Designation.js';
import Location from '../../organization/models/Location.js';
import Shift from '../../organization/models/Shift.js';
import Employee from '../../employees/models/Employee.js';
import EmployeeProfileExtended from '../models/EmployeeProfileExtended.js';
import { INDIAN_ENGINEERING_SAMPLES } from './indianEngineeringSamples.js';
import { connectDB } from '../../../platform/database/db.js';

export async function seedNexusIndianWorkforce(orgId = null) {
  try {
    let org;
    if (orgId) {
      org = await Organization.findById(orgId);
    } else {
      org = await Organization.findOne({ code: 'DEV' }) || await Organization.findOne();
    }

    if (!org) {
      console.log('⚠️ No organization found to seed Nexus workforce.');
      return;
    }

    console.log(`🏢 Seeding Nexus Indian Engineering Workforce for Organization: ${org.name} (${org._id})`);

    // Ensure Departments
    const deptList = [
      { code: 'ENG', name: 'Engineering' },
      { code: 'PLT', name: 'Platform & DevOps' },
      { code: 'AIML', name: 'AI Research & Data' },
      { code: 'PRD', name: 'Product & Design' },
      { code: 'QA', name: 'Quality Engineering' }
    ];
    const deptMap = {};
    for (const d of deptList) {
      let dept = await Department.findOne({ code: d.code, organizationId: org._id });
      if (!dept) {
        dept = await Department.create({
          organizationId: org._id,
          code: d.code,
          name: d.name,
          level: 1
        });
      }
      deptMap[d.name] = dept._id;
      deptMap[d.code] = dept._id;
    }

    // Ensure Locations in India
    const locationList = [
      { code: 'BLR', name: 'Bangalore Tech Hub', address: 'Outer Ring Road, Bellandur, Bangalore, Karnataka, India', timezone: 'Asia/Kolkata' },
      { code: 'HYD', name: 'Hyderabad Innovation Hub', address: 'HITEC City, Madhapur, Hyderabad, Telangana, India', timezone: 'Asia/Kolkata' },
      { code: 'PUN', name: 'Pune Engineering Center', address: 'Hinjawadi Phase 1, Pune, Maharashtra, India', timezone: 'Asia/Kolkata' },
      { code: 'GGN', name: 'Gurgaon Cyber City', address: 'DLF Cyber City, Phase 2, Gurgaon, Haryana, India', timezone: 'Asia/Kolkata' },
      { code: 'NOI', name: 'Noida Tech Zone', address: 'Sector 62, Electronic City, Noida, Uttar Pradesh, India', timezone: 'Asia/Kolkata' },
      { code: 'CHN', name: 'Chennai IT Corridor', address: 'Old Mahabalipuram Road (OMR), Chennai, Tamil Nadu, India', timezone: 'Asia/Kolkata' }
    ];
    const locMap = {};
    for (const loc of locationList) {
      let l = await Location.findOne({ code: loc.code, organizationId: org._id });
      if (!l) {
        l = await Location.create({
          organizationId: org._id,
          code: loc.code,
          name: loc.name,
          address: loc.address,
          timezone: loc.timezone
        });
      }
      locMap[loc.name] = l._id;
      locMap[loc.code] = l._id;
    }

    // Ensure Shift
    let shift = await Shift.findOne({ code: 'GEN', organizationId: org._id });
    if (!shift) {
      shift = await Shift.create({
        organizationId: org._id,
        code: 'GEN',
        name: 'India Standard Shift',
        startTime: '09:30',
        endTime: '18:30'
      });
    }

    // Ensure Lead Manager
    let leadManager = await Employee.findOne({ employeeCode: 'EMP-IND-105', organizationId: org._id });

    // Seed Employees & Intelligence Profiles
    for (const sample of INDIAN_ENGINEERING_SAMPLES) {
      const desCode = sample.code.replace('EMP-', 'DES-');
      
      // Find or create Designation
      let designation = await Designation.findOne({ code: desCode, organizationId: org._id });
      if (!designation) {
        designation = await Designation.create({
          organizationId: org._id,
          code: desCode,
          title: sample.designation,
          description: sample.headline || sample.designation
        });
      }

      // Determine Location
      let locId = locMap['BLR'];
      if (sample.location?.includes('Hyderabad')) locId = locMap['HYD'];
      else if (sample.location?.includes('Pune')) locId = locMap['PUN'];
      else if (sample.location?.includes('Gurgaon')) locId = locMap['GGN'];
      else if (sample.location?.includes('Noida')) locId = locMap['NOI'];
      else if (sample.location?.includes('Chennai')) locId = locMap['CHN'];

      // Find or create Employee
      let emp = await Employee.findOne({ employeeCode: sample.code, organizationId: org._id });
      if (!emp) {
        emp = await Employee.create({
          organizationId: org._id,
          employeeCode: sample.code,
          firstName: sample.firstName,
          lastName: sample.lastName,
          workEmail: sample.workEmail,
          departmentId: deptMap[sample.department] || deptMap['ENG'],
          designationId: designation._id,
          locationId: locId,
          shiftId: shift._id,
          managerId: sample.code === 'EMP-IND-105' ? null : (leadManager?._id || null),
          joiningDate: new Date('2022-04-15'),
          status: 'ACTIVE'
        });
        if (sample.code === 'EMP-IND-105') {
          leadManager = emp;
        }
      }

      // Find or create Extended Intelligence Profile
      let extended = await EmployeeProfileExtended.findOne({ employeeId: emp._id, organizationId: org._id });
      if (!extended) {
        await EmployeeProfileExtended.create({
          organizationId: org._id,
          employeeId: emp._id,
          headline: sample.headline || `${sample.designation} | Engineering`,
          summary: sample.summary || `${sample.totalExperienceYears || 4}+ years driving high impact software engineering.`,
          totalExperienceYears: sample.totalExperienceYears || 4,
          currentLocation: sample.currentLocation || `${sample.location || 'Bangalore, India'} (Hybrid)`,
          githubUrl: sample.githubUrl || `https://github.com/${sample.firstName.toLowerCase()}-${sample.lastName.toLowerCase()}`,
          linkedinUrl: sample.linkedinUrl || `https://linkedin.com/in/${sample.firstName.toLowerCase()}-${sample.lastName.toLowerCase()}`,
          skills: sample.skills || [],
          experience: sample.experience || [
            {
              title: sample.designation,
              company: 'NexusTech India',
              location: sample.location || 'Bangalore, KA',
              startDate: '2022-04-15',
              endDate: 'Present',
              current: true,
              description: 'Contributing to high-scale engineering platform architectures.',
              technologies: (sample.skills || []).map(s => s.name).slice(0, 4)
            }
          ],
          projects: sample.projects || [
            {
              name: 'Enterprise Platform Capability Modernization',
              role: sample.designation,
              description: 'Architecting resilient services with microservice modularity.',
              technologies: (sample.skills || []).map(s => s.name).slice(0, 3),
              duration: '8 Months',
              impact: 'Achieved 99.99% system availability.'
            }
          ],
          certifications: sample.certifications || [],
          careerPreferences: sample.careerPreferences || {
            desiredRoles: ['Staff Engineer', 'Engineering Manager'],
            targetSkills: ['Distributed Systems', 'Cloud Architecture'],
            interestDomains: ['High-Scale Systems', 'Platform Engineering'],
            willingToRelocate: false,
            preferredWorkMode: 'HYBRID'
          }
        });
      }
    }

    console.log(`✅ Seeded ${INDIAN_ENGINEERING_SAMPLES.length} Indian Engineering Workforce Intelligence Profiles!`);
  } catch (error) {
    console.error('❌ Failed to seed Nexus Indian workforce:', error);
  }
}

// Standalone execution support
if (process.argv[1]?.endsWith('seedNexusWorkforce.js')) {
  (async () => {
    await connectDB();
    await seedNexusIndianWorkforce();
    process.exit(0);
  })();
}
