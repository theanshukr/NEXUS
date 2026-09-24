import mongoose from 'mongoose';
import EmployeeProfileExtended from '../models/EmployeeProfileExtended.js';
import Employee from '../../employees/models/Employee.js';
import { INDIAN_ENGINEERING_SAMPLES } from '../seeders/indianEngineeringSamples.js';
import { NotFoundError, ValidationError } from '../../../core/errors/AppError.js';

class NexusProfileService {
  /**
   * Get or dynamically bootstrap unified intelligence profile for an employee
   */
  async getUnifiedProfile(employeeIdentifier, organizationId) {
    let query = { archivedAt: null };
    if (organizationId) {
      query.organizationId = organizationId;
    }

    if (mongoose.Types.ObjectId.isValid(employeeIdentifier)) {
      query._id = employeeIdentifier;
    } else {
      query.$or = [
        { employeeCode: employeeIdentifier },
        { workEmail: employeeIdentifier }
      ];
    }

    let employee = await Employee.findOne(query)
      .populate('departmentId', 'name code')
      .populate('designationId', 'name level title')
      .populate('locationId', 'name address')
      .populate('shiftId', 'name startTime endTime')
      .populate('managerId', 'firstName lastName employeeCode workEmail')
      .lean();

    if (!employee) {
      // If organizationId restricted it, try finding without organizationId check if system admin
      if (organizationId) {
        delete query.organizationId;
        employee = await Employee.findOne(query)
          .populate('departmentId', 'name code')
          .populate('designationId', 'name level title')
          .populate('locationId', 'name address')
          .populate('shiftId', 'name startTime endTime')
          .populate('managerId', 'firstName lastName employeeCode workEmail')
          .lean();
      }
    }

    if (!employee) {
      throw new NotFoundError(`Employee not found: ${employeeIdentifier}`);
    }

    // Check if extended profile already exists in DB
    let extended = await EmployeeProfileExtended.findOne({
      employeeId: employee._id,
      organizationId
    }).lean();

    // If not yet persisted, seed or match dynamically from Indian Engineering Samples
    if (!extended) {
      const sampleMatch = this._findSampleProfileForEmployee(employee);
      
      const newExtendedDoc = await EmployeeProfileExtended.create({
        organizationId,
        employeeId: employee._id,
        headline: sampleMatch.headline || `${employee.designationId?.name || 'Software Engineer'} | Engineering`,
        summary: sampleMatch.summary || 'Engineering professional driving high-impact technical initiatives.',
        totalExperienceYears: sampleMatch.totalExperienceYears || 5,
        currentLocation: sampleMatch.currentLocation || `${employee.locationId?.name || 'Bangalore'}, India (Hybrid)`,
        githubUrl: sampleMatch.githubUrl || `https://github.com/${employee.firstName.toLowerCase()}-${employee.lastName.toLowerCase()}`,
        linkedinUrl: sampleMatch.linkedinUrl || `https://linkedin.com/in/${employee.firstName.toLowerCase()}-${employee.lastName.toLowerCase()}`,
        skills: sampleMatch.skills || [],
        experience: sampleMatch.experience || [],
        projects: sampleMatch.projects || [],
        certifications: sampleMatch.certifications || [],
        careerPreferences: sampleMatch.careerPreferences || {
          desiredRoles: ['Senior Engineering Lead', 'Principal Architect'],
          targetSkills: ['System Design', 'Cloud Architecture'],
          interestDomains: ['High-Scale Systems', 'Platform Engineering'],
          willingToRelocate: false,
          preferredWorkMode: 'HYBRID'
        }
      });

      extended = newExtendedDoc.toObject();
    }

    // Merge into one cohesive unified Intelligence Profile
    return {
      // Base HR Information (Protected)
      employee: {
        id: employee._id,
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        workEmail: employee.workEmail,
        department: employee.departmentId?.name || 'Engineering',
        designation: employee.designationId?.name || 'Software Engineer',
        location: employee.locationId?.name || 'Bangalore Tech Hub',
        shift: employee.shiftId?.name || 'General Shift',
        manager: employee.managerId ? `${employee.managerId.firstName} ${employee.managerId.lastName}` : 'None',
        joiningDate: employee.joiningDate,
        status: employee.status
      },
      // Nexus Extended Intelligence
      intelligence: {
        headline: extended.headline,
        summary: extended.summary,
        totalExperienceYears: extended.totalExperienceYears,
        currentLocation: extended.currentLocation,
        githubUrl: extended.githubUrl,
        linkedinUrl: extended.linkedinUrl,
        skills: extended.skills || [],
        experience: extended.experience || [],
        projects: extended.projects || [],
        certifications: extended.certifications || [],
        careerPreferences: extended.careerPreferences || {},
        metrics: {
          totalSkillsCount: (extended.skills || []).length,
          verifiedSkillsCount: (extended.skills || []).filter(s => s.verificationStatus === 'VERIFIED').length,
          projectsCount: (extended.projects || []).length,
          certificationsCount: (extended.certifications || []).length,
          topSkillCategory: this._getTopCategory(extended.skills || [])
        }
      }
    };
  }

  /**
   * Update full extended profile (headline, summary, career goals, etc.)
   */
  async updateProfile(employeeId, updateData, user, organizationId) {
    let extended = await EmployeeProfileExtended.findOne({
      employeeId,
      organizationId
    });

    if (!extended) {
      // Trigger lazy creation first
      await this.getUnifiedProfile(employeeId, organizationId);
      extended = await EmployeeProfileExtended.findOne({ employeeId, organizationId });
    }

    if (updateData.headline !== undefined) extended.headline = updateData.headline;
    if (updateData.summary !== undefined) extended.summary = updateData.summary;
    if (updateData.totalExperienceYears !== undefined) extended.totalExperienceYears = updateData.totalExperienceYears;
    if (updateData.currentLocation !== undefined) extended.currentLocation = updateData.currentLocation;
    if (updateData.githubUrl !== undefined) extended.githubUrl = updateData.githubUrl;
    if (updateData.linkedinUrl !== undefined) extended.linkedinUrl = updateData.linkedinUrl;
    if (updateData.careerPreferences) extended.careerPreferences = { ...extended.careerPreferences, ...updateData.careerPreferences };
    if (updateData.experience) extended.experience = updateData.experience;
    if (updateData.projects) extended.projects = updateData.projects;
    if (updateData.certifications) extended.certifications = updateData.certifications;

    await extended.save();
    return this.getUnifiedProfile(employeeId, organizationId);
  }

  /**
   * Add a skill to an employee's profile
   */
  async addSkill(employeeId, skillData, user, organizationId) {
    let extended = await EmployeeProfileExtended.findOne({
      employeeId,
      organizationId
    });

    if (!extended) {
      await this.getUnifiedProfile(employeeId, organizationId);
      extended = await EmployeeProfileExtended.findOne({ employeeId, organizationId });
    }

    // Check for duplicate skill name
    const existingIndex = extended.skills.findIndex(
      s => s.name.toLowerCase().trim() === skillData.name.toLowerCase().trim()
    );

    if (existingIndex !== -1) {
      // Update existing skill
      extended.skills[existingIndex].proficiency = skillData.proficiency || extended.skills[existingIndex].proficiency;
      extended.skills[existingIndex].yearsOfExperience = skillData.yearsOfExperience || extended.skills[existingIndex].yearsOfExperience;
      extended.skills[existingIndex].category = skillData.category || extended.skills[existingIndex].category;
    } else {
      const isManager = user?.roles?.includes('HR Manager') || user?.roles?.includes('Super Admin');
      extended.skills.push({
        name: skillData.name.trim(),
        category: skillData.category || 'GENERAL',
        proficiency: skillData.proficiency || 'Intermediate',
        yearsOfExperience: skillData.yearsOfExperience || 1,
        source: skillData.source || (isManager ? 'MANAGER_VERIFIED' : 'SELF_REPORTED'),
        confidence: skillData.confidence || 0.9,
        verificationStatus: isManager ? 'VERIFIED' : 'PENDING',
        verifiedBy: isManager ? user._id : null,
        verifiedAt: isManager ? new Date() : null
      });
    }

    await extended.save();
    return this.getUnifiedProfile(employeeId, organizationId);
  }

  /**
   * Update a skill's proficiency or verification status
   */
  async updateSkill(employeeId, skillId, updateData, user, organizationId) {
    const extended = await EmployeeProfileExtended.findOne({
      employeeId,
      organizationId
    });

    if (!extended) {
      throw new NotFoundError('Employee extended profile not found');
    }

    const skill = extended.skills.id(skillId);
    if (!skill) {
      throw new NotFoundError(`Skill with ID ${skillId} not found`);
    }

    if (updateData.name) skill.name = updateData.name;
    if (updateData.category) skill.category = updateData.category;
    if (updateData.proficiency) skill.proficiency = updateData.proficiency;
    if (updateData.yearsOfExperience !== undefined) skill.yearsOfExperience = updateData.yearsOfExperience;
    if (updateData.verificationStatus) {
      skill.verificationStatus = updateData.verificationStatus;
      if (updateData.verificationStatus === 'VERIFIED') {
        skill.verifiedBy = user._id;
        skill.verifiedAt = new Date();
      }
    }

    await extended.save();
    return this.getUnifiedProfile(employeeId, organizationId);
  }

  /**
   * Remove a skill from an employee profile
   */
  async removeSkill(employeeId, skillId, user, organizationId) {
    const extended = await EmployeeProfileExtended.findOne({
      employeeId,
      organizationId
    });

    if (!extended) {
      throw new NotFoundError('Employee extended profile not found');
    }

    extended.skills.pull({ _id: skillId });
    await extended.save();
    return this.getUnifiedProfile(employeeId, organizationId);
  }

  /**
   * Get all Indian engineering sample profiles for instant demo/workforce population
   */
  getSampleWorkforce() {
    return INDIAN_ENGINEERING_SAMPLES;
  }

  // --- Internal Helpers ---

  _findSampleProfileForEmployee(employee) {
    const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
    
    // Match by exact or partial name first
    const directMatch = INDIAN_ENGINEERING_SAMPLES.find(
      s => fullName.includes(s.firstName.toLowerCase()) || fullName.includes(s.lastName.toLowerCase())
    );
    if (directMatch) return directMatch;

    // Otherwise match by hash of employee ID to have a deterministic diverse profile
    const hash = String(employee._id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = hash % INDIAN_ENGINEERING_SAMPLES.length;
    return INDIAN_ENGINEERING_SAMPLES[index];
  }

  _getTopCategory(skills) {
    if (!skills.length) return 'Engineering';
    const counts = {};
    for (const s of skills) {
      counts[s.category] = (counts[s.category] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }
}

export default new NexusProfileService();
