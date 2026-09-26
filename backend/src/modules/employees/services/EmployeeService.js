import logger from '#@/platform/logger/index.js';
import EmployeeRepository from '../repositories/EmployeeRepository.js';
import EmploymentHistoryRepository from '../repositories/EmploymentHistoryRepository.js';
import AuditService from '#@/modules/audit/services/AuditService.js';
import EventBus from '#@/core/events/EventBus.js';
import { EVENTS } from '#@/core/constants/events/index.js';
import { runInTransaction } from '#@/platform/database/db.js';
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from '#@/core/errors/AppError.js';
import InviteService from '#@/modules/invitations/services/InviteService.js';
import SkillNormalizationService from '../../nexus/services/SkillNormalizationService.js';
import Skill from '../../nexus/models/Skill.js';
import EmployeeProfileExtended from '../../nexus/models/EmployeeProfileExtended.js';


/**
 * Status Transition Matrix (Architectural Rule).
 * Only transitions explicitly listed here are legal.
 * Archiving/Restoring are orthogonal soft-delete operations — NOT status transitions.
 */
const ALLOWED_TRANSITIONS = {
  ONBOARDING: ['INVITED'],
  INVITED: ['ACTIVE'],
  ACTIVE: ['SUSPENDED', 'RESIGNED', 'TERMINATED'],
  SUSPENDED: ['ACTIVE', 'TERMINATED'],
  RESIGNED: [],
  TERMINATED: []
};

/**
 * Statuses from which an invitation may be issued.
 * An employee must be in ONBOARDING to receive an invitation.
 */
const INVITABLE_STATUSES = ['ONBOARDING'];

/**
 * Statuses that disqualify an employee from being a manager.
 */
const INVALID_MANAGER_STATUSES = ['TERMINATED', 'RESIGNED', 'SUSPENDED'];

export class EmployeeService {

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------

  /**
   * Create a new employee profile.
   * Status starts at ONBOARDING. Transaction wraps creation + audit + event.
   */
  async createEmployee(payload, actor, organizationId) {
    const {
      employeeCode,
      firstName,
      lastName,
      workEmail,
      departmentId,
      designationId,
      locationId,
      shiftId,
      managerId = null,
      joiningDate,
      metadata = {}
    } = payload;

    const employee = await runInTransaction(async (session) => {
      const options = { session };

      const cleanWorkEmail = workEmail && typeof workEmail === 'string' && workEmail.trim()
        ? workEmail.toLowerCase().trim()
        : undefined;
      const cleanDeptId = departmentId && typeof departmentId === 'string' && departmentId.trim() ? departmentId.trim() : undefined;
      const cleanLocId = locationId && typeof locationId === 'string' && locationId.trim() ? locationId.trim() : undefined;
      const cleanShiftId = shiftId && typeof shiftId === 'string' && shiftId.trim() ? shiftId.trim() : undefined;
      const cleanManagerId = managerId && typeof managerId === 'string' && managerId.trim() ? managerId.trim() : null;

      // Uniqueness: employeeCode
      const existingCode = await EmployeeRepository.findByCode(employeeCode, organizationId, options);
      if (existingCode) {
        throw new ConflictError(`An employee with code '${employeeCode}' already exists in this organization.`);
      }

      // Uniqueness: workEmail (sparse — skip if undefined)
      if (cleanWorkEmail) {
        const existingEmail = await EmployeeRepository.findByEmail(cleanWorkEmail, organizationId, options);
        if (existingEmail) {
          throw new ConflictError(`An employee with work email '${cleanWorkEmail}' already exists in this organization.`);
        }
      }

      // Manager validation
      if (cleanManagerId) {
        await this._validateManager(cleanManagerId, null, organizationId, options);
      }

      const employee = await EmployeeRepository.createScoped({
        employeeCode: employeeCode.trim().toUpperCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(cleanWorkEmail ? { workEmail: cleanWorkEmail } : {}),
        ...(cleanDeptId ? { departmentId: cleanDeptId } : {}),
        designationId,
        ...(cleanLocId ? { locationId: cleanLocId } : {}),
        ...(cleanShiftId ? { shiftId: cleanShiftId } : {}),
        managerId: cleanManagerId,
        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
        status: 'ONBOARDING',
        metadata
      }, organizationId, options);

      await AuditService.logAction({
        organizationId,
        actorId: actor?.userId || null,
        action: 'EMPLOYEE_CREATED',
        entityType: 'Employee',
        entityId: employee._id,
        newValue: {
          employeeCode: employee.employeeCode,
          firstName: employee.firstName,
          lastName: employee.lastName,
          departmentId, designationId, locationId, shiftId, managerId
        }
      }, options);

      logger.info({ organizationId, employeeId: employee._id, code: employee.employeeCode }, 'Created employee');

      EventBus.emit(EVENTS.EMPLOYEE.CREATED, { organizationId, employeeId: employee._id, employeeCode: employee.employeeCode });
      return employee;
    });

    // PHASE 2: Process Skills & Build Extended Profile
    if (payload.skills && Array.isArray(payload.skills) && payload.skills.length > 0) {
      try {
        const employeeSkills = [];
        
        for (const skill of payload.skills) {
          const normalized = await SkillNormalizationService.normalizeSkill(skill.name, organizationId);
          let canonicalId = normalized.skillId;
          
          if (normalized.matchType === 'UNKNOWN') {
             // Create canonical Skill
             const newSkill = await Skill.create({
               organizationId,
               canonicalName: normalized.suggestedName,
               normalizedName: normalized.suggestedName.toLowerCase(),
               isVerified: true
             });
             canonicalId = newSkill._id;
          }

          employeeSkills.push({
            skillId: canonicalId,
            proficiency: skill.proficiency || 'Intermediate',
            yearsOfExperience: skill.yearsOfExperience || 1,
            source: 'MANAGER_VERIFIED',
            confidence: 0.9,
            verificationStatus: 'VERIFIED',
            verifiedBy: actor?.userId || null,
            verifiedAt: new Date()
          });
        }
        
        // Also populate the plain skills array for legacy compatibility
        const plainSkills = payload.skills.map(s => ({
          name: s.name,
          proficiency: s.proficiency || 'Intermediate',
          yearsOfExperience: s.yearsOfExperience || 1,
          source: 'MANAGER_VERIFIED',
          verificationStatus: 'VERIFIED',
          verifiedBy: actor?.userId || null,
          verifiedAt: new Date()
        }));

        await EmployeeProfileExtended.create({
          organizationId,
          employeeId: employee._id,
          headline: 'Newly Onboarded Employee',
          skills: plainSkills,
          employeeSkills: employeeSkills
        });
        
      } catch (err) {
        logger.error({ err, employeeId: employee._id }, 'Failed to process skills during onboarding');
      }
    }

    return employee;
  }

  // ---------------------------------------------------------------------------
  // READ
  // ---------------------------------------------------------------------------

  /**
   * Get a single non-archived employee by ID.
   */
  async getEmployeeById(id, organizationId, options = {}) {
    const employee = await EmployeeRepository.findById(id, organizationId, options);
    if (!employee) throw new NotFoundError('Employee not found.');
    return employee;
  }

  /**
   * Paginated employee listing with keyword search and filters.
   */
  async getEmployees(query, organizationId) {
    const {
      keyword,
      status,
      departmentId,
      locationId,
      page = 1,
      limit = 20,
      includeArchived = false,
      onlyArchived = false
    } = query;
    return await EmployeeRepository.search(
      { keyword, status, departmentId, locationId, page, limit },
      organizationId,
      { includeArchived: includeArchived === 'true' || includeArchived === true, onlyArchived: onlyArchived === 'true' || onlyArchived === true }
    );
  }

  /**
   * Build a hierarchical org chart from the flat employee list.
   * Returns an array of root nodes (managerId = null), each with a `directReports` array.
   */
  async getOrgChart(organizationId) {
    const all = await EmployeeRepository.findAllForOrgChart(organizationId);

    const map = {};
    const roots = [];

    for (const emp of all) {
      const item = emp.toObject ? emp.toObject() : { ...emp };
      item.directReports = [];
      map[String(item._id)] = item;
    }

    for (const id of Object.keys(map)) {
      const item = map[id];
      if (item.managerId && map[String(item.managerId)]) {
        map[String(item.managerId)].directReports.push(item);
      } else {
        roots.push(item);
      }
    }

    return roots;
  }

  // ---------------------------------------------------------------------------
  // UPDATE PROFILE
  // ---------------------------------------------------------------------------

  /**
   * Update editable profile fields only.
   * Allowed: firstName, lastName, workEmail, metadata.
   * Forbidden: departmentId, designationId, locationId, shiftId, managerId, status.
   */
  async updateEmployeeProfile(id, payload, actor, organizationId) {
    const { firstName, lastName, workEmail, metadata } = payload;

    return await runInTransaction(async (session) => {
      const options = { session };

      const employee = await EmployeeRepository.findById(id, organizationId, options);
      if (!employee) throw new NotFoundError('Employee not found.');

      if (employee.archivedAt) {
        throw new ValidationError('Cannot update an archived employee.');
      }

      const updates = {};
      const previousValue = {};
      const newValue = {};

      if (firstName !== undefined) {
        previousValue.firstName = employee.firstName;
        updates.firstName = firstName.trim();
        newValue.firstName = updates.firstName;
      }
      if (lastName !== undefined) {
        previousValue.lastName = employee.lastName;
        updates.lastName = lastName.trim();
        newValue.lastName = updates.lastName;
      }
      if (workEmail !== undefined) {
        // Uniqueness check for new email
        if (workEmail && workEmail.toLowerCase().trim() !== employee.workEmail) {
          const existing = await EmployeeRepository.findByEmail(workEmail, organizationId, options);
          if (existing && String(existing._id) !== String(id)) {
            throw new ConflictError(`Work email '${workEmail}' is already assigned to another employee.`);
          }
        }
        previousValue.workEmail = employee.workEmail;
        updates.workEmail = workEmail ? workEmail.toLowerCase().trim() : null;
        newValue.workEmail = updates.workEmail;
      }
      if (metadata !== undefined) {
        previousValue.metadata = employee.metadata;
        updates.metadata = metadata;
        newValue.metadata = metadata;
      }

      if (Object.keys(updates).length === 0) {
        return employee;
      }

      const updated = await EmployeeRepository.updateByIdAndTenant(id, updates, organizationId, options);

      await EmploymentHistoryRepository.appendEntry({
        employeeId: id,
        organizationId,
        type: 'STATUS_CHANGE', // Use a generic marker; specific type not applicable for profile edits
        previousValue,
        newValue,
        changedBy: actor?.userId || null
      }, options);

      await AuditService.logAction({
        organizationId,
        actorId: actor?.userId || null,
        action: 'EMPLOYEE_PROFILE_UPDATED',
        entityType: 'Employee',
        entityId: id,
        previousValue,
        newValue
      }, options);

      logger.info({ organizationId, employeeId: id }, 'Updated employee profile');
      EventBus.emit(EVENTS.EMPLOYEE.UPDATED, { organizationId, employeeId: id, changes: newValue });

      return updated;
    });
  }

  // ---------------------------------------------------------------------------
  // CHANGE STATUS
  // ---------------------------------------------------------------------------

  /**
   * Transition an employee's business status.
   * Validates against the Status Transition Matrix.
   * Emits EMPLOYEE.STATUS_CHANGED for downstream M-01 session revocation.
   */
  async changeStatus(id, newStatus, reason, actor, organizationId) {
    return await runInTransaction(async (session) => {
      const options = { session };

      // Fetch with includeArchived so we can give the correct error for already-archived employees
      const employee = await EmployeeRepository.findById(id, organizationId, { ...options, includeArchived: true });
      if (!employee) throw new NotFoundError('Employee not found.');

      if (employee.archivedAt) {
        throw new ValidationError('Cannot change status of an archived employee.');
      }

      const currentStatus = employee.status;
      const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

      if (!allowed.includes(newStatus)) {
        throw new ValidationError(
          `Invalid status transition: '${currentStatus}' → '${newStatus}'. Allowed: [${allowed.join(', ') || 'none'}].`
        );
      }

      const updated = await EmployeeRepository.updateByIdAndTenant(id, { status: newStatus }, organizationId, options);

      await EmploymentHistoryRepository.appendEntry({
        employeeId: id,
        organizationId,
        type: 'STATUS_CHANGE',
        previousValue: { status: currentStatus },
        newValue: { status: newStatus },
        changedBy: actor?.userId || null,
        changeReason: reason
      }, options);

      await AuditService.logAction({
        organizationId,
        actorId: actor?.userId || null,
        action: 'EMPLOYEE_STATUS_CHANGED',
        entityType: 'Employee',
        entityId: id,
        previousValue: { status: currentStatus },
        newValue: { status: newStatus, reason }
      }, options);

      logger.info({ organizationId, employeeId: id, from: currentStatus, to: newStatus }, 'Changed employee status');

      // Event-driven: M-01 UserService listens for this to revoke sessions on SUSPENDED/TERMINATED
      EventBus.emit(EVENTS.EMPLOYEE.STATUS_CHANGED, {
        organizationId,
        employeeId: id,
        userId: employee.userId,
        oldStatus: currentStatus,
        newStatus,
        reason
      });

      return updated;
    });
  }

  // ---------------------------------------------------------------------------
  // CHANGE MANAGER
  // ---------------------------------------------------------------------------

  /**
   * Reassign an employee's direct reporting manager.
   * Validates org boundary, cycle detection, and manager eligibility.
   */
  async changeManager(id, newManagerId, actor, organizationId) {
    return await runInTransaction(async (session) => {
      const options = { session };

      const employee = await EmployeeRepository.findById(id, organizationId, options);
      if (!employee) throw new NotFoundError('Employee not found.');

      if (employee.archivedAt) {
        throw new ValidationError('Cannot reassign manager for an archived employee.');
      }

      const oldManagerId = employee.managerId;

      if (newManagerId) {
        await this._validateManager(newManagerId, id, organizationId, options);
      }

      const updated = await EmployeeRepository.updateByIdAndTenant(id, { managerId: newManagerId || null }, organizationId, options);

      await EmploymentHistoryRepository.appendEntry({
        employeeId: id,
        organizationId,
        type: 'MANAGER_CHANGE',
        previousValue: { managerId: oldManagerId },
        newValue: { managerId: newManagerId || null },
        changedBy: actor?.userId || null
      }, options);

      await AuditService.logAction({
        organizationId,
        actorId: actor?.userId || null,
        action: 'EMPLOYEE_MANAGER_CHANGED',
        entityType: 'Employee',
        entityId: id,
        previousValue: { managerId: oldManagerId },
        newValue: { managerId: newManagerId || null }
      }, options);

      logger.info({ organizationId, employeeId: id, oldManagerId, newManagerId }, 'Changed employee manager');
      EventBus.emit(EVENTS.EMPLOYEE.MANAGER_CHANGED, {
        organizationId, employeeId: id, oldManagerId, newManagerId: newManagerId || null
      });

      return updated;
    });
  }

  // ---------------------------------------------------------------------------
  // INVITE
  // ---------------------------------------------------------------------------

  /**
   * Issue a M-01 invitation for an employee, transitioning them to INVITED status.
   * Only employees in ONBOARDING status are eligible.
   */
  async inviteEmployee(id, roleIds, actor, organizationId) {
    return await runInTransaction(async (session) => {
      const options = { session };

      const employee = await EmployeeRepository.findById(id, organizationId, options);
      if (!employee) throw new NotFoundError('Employee not found.');

      if (employee.archivedAt) {
        throw new ValidationError('Cannot invite an archived employee.');
      }

      if (!INVITABLE_STATUSES.includes(employee.status)) {
        throw new ValidationError(
          `Employee cannot be invited in '${employee.status}' status. Must be in: [${INVITABLE_STATUSES.join(', ')}].`
        );
      }

      if (!employee.workEmail) {
        throw new ValidationError('Employee must have a work email before they can be invited.');
      }

      // Create M-01 invitation via InviteService
      const invitation = await InviteService.createInvitation(
        { email: employee.workEmail, roleIds },
        { userId: actor?.userId, organizationId }
      );

      // Transition to INVITED
      await EmployeeRepository.updateByIdAndTenant(id, { status: 'INVITED' }, organizationId, options);

      await EmploymentHistoryRepository.appendEntry({
        employeeId: id,
        organizationId,
        type: 'STATUS_CHANGE',
        previousValue: { status: 'ONBOARDING' },
        newValue: { status: 'INVITED' },
        changedBy: actor?.userId || null
      }, options);

      await AuditService.logAction({
        organizationId,
        actorId: actor?.userId || null,
        action: 'EMPLOYEE_STATUS_CHANGED',
        entityType: 'Employee',
        entityId: id,
        previousValue: { status: 'ONBOARDING' },
        newValue: { status: 'INVITED', inviteId: invitation.inviteId }
      }, options);

      logger.info({ organizationId, employeeId: id, inviteId: invitation.inviteId }, 'Invited employee');
      EventBus.emit(EVENTS.EMPLOYEE.INVITED, {
        organizationId,
        employeeId: id,
        inviteId: invitation.inviteId
      });

      return { employee: { ...employee.toObject(), status: 'INVITED' }, invitation };
    });
  }

  // ---------------------------------------------------------------------------
  // ARCHIVE
  // ---------------------------------------------------------------------------

  /**
   * Soft-delete an employee. Does NOT change their business status.
   * Sets archivedAt, archivedBy, archiveReason metadata (M-02 pattern).
   *
   * Extension point: future modules (Payroll, Leave) may add blocking hooks here.
   */
  async archiveEmployee(id, reason, actor, organizationId) {
    return await runInTransaction(async (session) => {
      const options = { session };

      // Fetch with includeArchived so double-archive returns ConflictError, not NotFoundError
      const employee = await EmployeeRepository.findById(id, organizationId, { ...options, includeArchived: true });
      if (!employee) throw new NotFoundError('Employee not found.');

      if (employee.archivedAt) {
        throw new ConflictError('Employee is already archived.');
      }

      const archived = await EmployeeRepository.updateByIdAndTenant(id, {
        archivedAt: new Date(),
        archivedBy: actor?.userId || null,
        archiveReason: reason?.trim() || null
      }, organizationId, options);

      await AuditService.logAction({
        organizationId,
        actorId: actor?.userId || null,
        action: 'EMPLOYEE_ARCHIVED',
        entityType: 'Employee',
        entityId: id,
        newValue: { archiveReason: reason }
      }, options);

      logger.info({ organizationId, employeeId: id }, 'Archived employee');
      EventBus.emit(EVENTS.EMPLOYEE.ARCHIVED, {
        organizationId, employeeId: id, archiveReason: reason
      });

      return archived;
    });
  }

  // ---------------------------------------------------------------------------
  // RESTORE
  // ---------------------------------------------------------------------------

  /**
   * Restore a soft-deleted employee by clearing archive metadata.
   * Does NOT change business status — employee returns to their current status.
   * Validates that structural references (department, manager) are still active.
   */
  async restoreEmployee(id, actor, organizationId) {
    return await runInTransaction(async (session) => {
      const options = { session };

      const employee = await EmployeeRepository.findById(id, organizationId, { ...options, includeArchived: true });
      if (!employee) throw new NotFoundError('Employee not found.');

      if (!employee.archivedAt) {
        throw new ConflictError('Employee is not archived.');
      }

      // Validate manager is still active (may have been archived during absence)
      if (employee.managerId) {
        const manager = await EmployeeRepository.findById(employee.managerId, organizationId, options);
        if (!manager) {
          throw new ValidationError(
            'Cannot restore: the assigned manager no longer exists or has been archived. Please reassign the manager first.'
          );
        }
        if (INVALID_MANAGER_STATUSES.includes(manager.status)) {
          throw new ValidationError(
            `Cannot restore: the assigned manager is currently '${manager.status}'. Please reassign the manager first.`
          );
        }
      }

      const restored = await EmployeeRepository.updateByIdAndTenant(id, {
        archivedAt: null,
        archivedBy: null,
        archiveReason: null
      }, organizationId, options);

      await EmploymentHistoryRepository.appendEntry({
        employeeId: id,
        organizationId,
        type: 'RESTORE',
        previousValue: { archivedAt: employee.archivedAt },
        newValue: { archivedAt: null },
        changedBy: actor?.userId || null
      }, options);

      await AuditService.logAction({
        organizationId,
        actorId: actor?.userId || null,
        action: 'EMPLOYEE_RESTORED',
        entityType: 'Employee',
        entityId: id,
        newValue: { restoredStatus: restored.status }
      }, options);

      logger.info({ organizationId, employeeId: id }, 'Restored employee');
      EventBus.emit(EVENTS.EMPLOYEE.RESTORED, { organizationId, employeeId: id });

      return restored;
    });
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Validates that a candidate manager is eligible:
   * - Belongs to the same organization
   * - Is not archived
   * - Is not TERMINATED or RESIGNED
   * - Is not the same as the employee being updated (self-management)
   * - Does not create a circular reporting chain
   */
  async _validateManager(managerId, employeeId, organizationId, options = {}) {
    if (employeeId && String(managerId) === String(employeeId)) {
      throw new ValidationError('An employee cannot report to themselves.');
    }

    const manager = await EmployeeRepository.findById(managerId, organizationId, options);
    if (!manager) {
      throw new NotFoundError('Assigned manager not found or is archived in this organization.');
    }

    if (INVALID_MANAGER_STATUSES.includes(manager.status)) {
      throw new ValidationError(`Cannot assign a manager with status '${manager.status}'.`);
    }

    if (employeeId) {
      const hasCycle = await EmployeeRepository.detectsCycle(employeeId, managerId, organizationId, options);
      if (hasCycle) {
        throw new ConflictError('Circular reporting chain detected: this manager assignment would create an infinite reporting loop.');
      }
    }
  }
}

export default new EmployeeService();


