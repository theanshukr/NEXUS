import logger from '#@/platform/logger/index.js';
import RoleRepository from '#@/modules/roles/repositories/RoleRepository.js';
import UserRoleRepository from '#@/modules/roles/repositories/UserRoleRepository.js';
import RbacService, { SYSTEM_PERMISSIONS } from '#@/modules/roles/services/RbacService.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';
import AuditService from '#@/modules/audit/services/AuditService.js';
import { runInTransaction } from '#@/platform/database/db.js';
import { ForbiddenError, ValidationError, ConflictError, NotFoundError } from '#@/core/errors/AppError.js';
import RoleDelegationService from '#@/modules/roles/services/RoleDelegationService.js';

export class RoleService {
  /**
   * Provisions the 5 standard System Role Templates for a newly created tenant organization.
   * Supports execution inside an ACID transaction via `options = { session }`.
   * @param {string} organizationId 
   * @param {Object} options
   */
  async provisionSystemTemplates(organizationId, options = {}) {
    const allPermStrings = SYSTEM_PERMISSIONS.map(p => p.permission);

    const templates = [
      {
        name: 'Super Admin',
        description: 'System template: Unrestricted administrative access across all modules.',
        priority: 0,
        permissions: ['*'],
        isSystemTemplate: true
      },
      {
        name: 'HR Manager',
        description: 'System template: Full control over personnel, attendance, leaves, and onboarding invitations.',
        priority: 20,
        permissions: allPermStrings.filter(p => p.startsWith('user.') || p.startsWith('attendance.') || p.startsWith('leave.') || p.startsWith('department.') || p.startsWith('designation.') || p.startsWith('location.') || p.startsWith('shift.') || p.startsWith('recruitment.') || p === PERMISSIONS.ROLE.ASSIGN || p === PERMISSIONS.ROLE.READ || p === PERMISSIONS.INVITE.CREATE || p === PERMISSIONS.INVITE.REVOKE || p.startsWith('ai.')),
        isSystemTemplate: true
      },
      {
        name: 'Finance Executive',
        description: 'System template: Full control over payroll calculations, ledger locking, and salary viewing.',
        priority: 30,
        permissions: [PERMISSIONS.PAYROLL.RUN, PERMISSIONS.PAYROLL.LOCK, PERMISSIONS.PAYROLL.VIEW_SALARY, PERMISSIONS.USER.READ, PERMISSIONS.ATTENDANCE.APPROVE, PERMISSIONS.LEAVE.REQUEST_APPROVE, PERMISSIONS.AI.USE, PERMISSIONS.AI.EXECUTE_TOOL, PERMISSIONS.DEPARTMENT.READ, PERMISSIONS.DESIGNATION.READ, PERMISSIONS.LOCATION.READ, PERMISSIONS.SHIFT.READ, PERMISSIONS.RECRUITMENT.JOB.VIEW],
        isSystemTemplate: true
      },
      {
        name: 'Department Manager',
        description: 'System template: Approval authority over subordinate attendance regularizations and leave applications.',
        priority: 50,
        permissions: [PERMISSIONS.ATTENDANCE.MARK, PERMISSIONS.ATTENDANCE.APPROVE, PERMISSIONS.LEAVE.REQUEST_SUBMIT, PERMISSIONS.LEAVE.REQUEST_APPROVE, PERMISSIONS.USER.READ, PERMISSIONS.USER.READ_SELF, PERMISSIONS.INVITE.CREATE, PERMISSIONS.AI.USE, PERMISSIONS.AI.EXECUTE_TOOL, PERMISSIONS.DEPARTMENT.READ, PERMISSIONS.DESIGNATION.READ, PERMISSIONS.LOCATION.READ, PERMISSIONS.SHIFT.READ, PERMISSIONS.RECRUITMENT.JOB.VIEW],
        isSystemTemplate: true
      },
      {
        name: 'Standard Employee',
        description: 'System template: Basic access for daily attendance marking and leave application submission.',
        priority: 80,
        permissions: [PERMISSIONS.ATTENDANCE.MARK, PERMISSIONS.LEAVE.REQUEST_SUBMIT, PERMISSIONS.USER.READ_SELF, PERMISSIONS.AI.USE, PERMISSIONS.DEPARTMENT.READ, PERMISSIONS.DESIGNATION.READ, PERMISSIONS.LOCATION.READ, PERMISSIONS.SHIFT.READ, PERMISSIONS.RECRUITMENT.JOB.VIEW],
        isSystemTemplate: true
      },
      {
        name: 'Administrator',
        description: 'System template: General administrative control across operations and personnel.',
        priority: 10,
        permissions: allPermStrings.filter(p => p.startsWith('user.') || p.startsWith('attendance.') || p.startsWith('department.') || p.startsWith('designation.') || p.startsWith('location.') || p.startsWith('shift.') || p === PERMISSIONS.ROLE.READ || p === PERMISSIONS.INVITE.CREATE || p === PERMISSIONS.INVITE.REVOKE || p.startsWith('ai.')),
        isSystemTemplate: true
      },
      {
        name: 'Intern',
        description: 'System template: Limited access for interns and temporary staff.',
        priority: 90,
        permissions: [PERMISSIONS.ATTENDANCE.MARK, PERMISSIONS.LEAVE.REQUEST_SUBMIT, PERMISSIONS.USER.READ_SELF, PERMISSIONS.AI.USE, PERMISSIONS.DEPARTMENT.READ, PERMISSIONS.DESIGNATION.READ, PERMISSIONS.LOCATION.READ, PERMISSIONS.SHIFT.READ, PERMISSIONS.RECRUITMENT.JOB.VIEW],
        isSystemTemplate: true
      }
    ];

    const createdRoles = [];
    for (const tpl of templates) {
      const existing = await RoleRepository.findByNameAndTenant(tpl.name, organizationId, options);
      if (!existing) {
        const created = await RoleRepository.createScoped(tpl, organizationId, options);
        createdRoles.push(created);
      } else {
        createdRoles.push(existing);
      }
    }

    logger.info({ organizationId, templateCount: createdRoles.length }, 'Provisioned system role templates for organization');
    return createdRoles;
  }

  /**
   * Retrieves all active dynamic roles owned by the tenant.
   */
  async getRoles(organizationId, options = {}) {
    return await RoleRepository.findActiveRoles(organizationId, options);
  }

  /**
   * Creates a custom role within an organization.
   */
  async createCustomRole(data, actorContext) {
    const { name, description, priority, permissions } = data;
    const { userId, organizationId } = actorContext;

    const existing = await RoleRepository.findByNameAndTenant(name, organizationId);
    if (existing) {
      throw new ConflictError(`A role with the name '${name}' already exists in this organization.`);
    }

    const actorPriority = await this._getActorHighestPriority(userId, organizationId);
    if (priority <= actorPriority && actorPriority !== 0) {
      throw new ForbiddenError(`You cannot create a role with priority (${priority}) equal to or higher than your own highest role priority (${actorPriority}).`);
    }

    const actorPerms = await RbacService.getEffectivePermissions(userId, organizationId);
    if (!actorPerms.has('*')) {
      for (const perm of permissions) {
        if (!actorPerms.has(perm)) {
          throw new ForbiddenError(`Security violation: You cannot grant the permission [${perm}] because you do not possess it.`);
        }
      }
    }

    const newRole = await RoleRepository.createScoped({
      name: name.trim(),
      description: description?.trim(),
      priority,
      permissions: Array.from(new Set(permissions)),
      isSystemTemplate: false,
      status: 'ACTIVE'
    }, organizationId);

    await AuditService.logAction({
      organizationId,
      actorId: userId,
      action: 'ROLE_CREATED',
      entityType: 'Role',
      entityId: newRole._id,
      newValue: { name: newRole.name, priority: newRole.priority, permissions: newRole.permissions }
    });

    logger.info({ roleId: newRole._id, name: newRole.name, organizationId }, 'Created custom RBAC role and recorded audit log');
    return newRole;
  }

  /**
   * Updates an existing custom role's permissions or priority.
   */
  async updateRole(roleId, updateData, actorContext) {
    const { userId, organizationId } = actorContext;
    const role = await RoleRepository.findByIdAndTenant(roleId, organizationId);
    if (!role || role.status !== 'ACTIVE') {
      throw new NotFoundError('Role not found.');
    }

    if (role.isSystemTemplate && updateData.name && updateData.name !== role.name) {
      throw new ForbiddenError('System template names cannot be modified. You may duplicate this role instead.');
    }

    const actorPriority = await this._getActorHighestPriority(userId, organizationId);
    if (role.priority <= actorPriority && actorPriority !== 0) {
      throw new ForbiddenError('You cannot modify a role that has a priority equal to or higher than your own.');
    }

    const previousValue = { name: role.name, priority: role.priority, permissions: [...role.permissions] };

    if (updateData.permissions) {
      const actorPerms = await RbacService.getEffectivePermissions(userId, organizationId);
      if (!actorPerms.has('*')) {
        for (const perm of updateData.permissions) {
          if (!actorPerms.has(perm)) {
            throw new ForbiddenError(`You cannot grant permission [${perm}].`);
          }
        }
      }
      role.permissions = Array.from(new Set(updateData.permissions));
    }

    if (updateData.name) role.name = updateData.name.trim();
    if (updateData.description !== undefined) role.description = updateData.description.trim();
    if (updateData.priority !== undefined) {
      if (updateData.priority <= actorPriority && actorPriority !== 0) {
        throw new ForbiddenError(`Cannot elevate role priority above or equal to your own (${actorPriority}).`);
      }
      role.priority = updateData.priority;
    }

    const updated = await RoleRepository.updateByIdAndTenant(roleId, role, organizationId);
    await RbacService.invalidateRoleUsersCache(roleId, organizationId);
    await RoleDelegationService.invalidateAllForRole(organizationId, roleId);

    await AuditService.logAction({
      organizationId,
      actorId: userId,
      action: 'ROLE_UPDATED',
      entityType: 'Role',
      entityId: roleId,
      previousValue,
      newValue: { name: updated.name, priority: updated.priority, permissions: updated.permissions }
    });

    logger.info({ roleId, organizationId }, 'Updated RBAC role, invalidated user caches, and recorded audit log');
    return updated;
  }

  /**
   * Clones/duplicates an existing role into a new custom role.
   */
  async duplicateRole(sourceRoleId, newName, actorContext) {
    const { organizationId } = actorContext;
    const sourceRole = await RoleRepository.findByIdAndTenant(sourceRoleId, organizationId);
    if (!sourceRole) throw new NotFoundError('Source role not found.');

    return await this.createCustomRole({
      name: newName,
      description: `Cloned from ${sourceRole.name}`,
      priority: Math.min(sourceRole.priority + 5, 99),
      permissions: sourceRole.permissions
    }, actorContext);
  }

  /**
   * Archives a role if it is not currently assigned to any active user.
   */
  async deleteRole(roleId, actorContext) {
    const { userId, organizationId } = actorContext;
    const role = await RoleRepository.findByIdAndTenant(roleId, organizationId);
    if (!role) throw new NotFoundError('Role not found.');

    if (role.isSystemTemplate && role.priority === 0) {
      throw new ForbiddenError('The Super Admin system template cannot be archived.');
    }

    const actorPriority = await this._getActorHighestPriority(userId, organizationId);
    if (role.priority <= actorPriority && actorPriority !== 0) {
      throw new ForbiddenError('Cannot archive a role with priority equal to or higher than your own.');
    }

    const assignedUsersCount = await UserRoleRepository.countUsersWithRole(roleId, organizationId);
    if (assignedUsersCount > 0) {
      throw new ValidationError(`Cannot archive role '${role.name}' because it is currently assigned to ${assignedUsersCount} users. Reassign those users first.`);
    }

    const archived = await RoleRepository.archiveRole(roleId, organizationId);
    await RoleDelegationService.invalidateAllForRole(organizationId, roleId);

    await AuditService.logAction({
      organizationId,
      actorId: userId,
      action: 'ROLE_ARCHIVED',
      entityType: 'Role',
      entityId: roleId,
      previousValue: { status: 'ACTIVE' },
      newValue: { status: 'ARCHIVED' }
    });

    logger.info({ roleId, organizationId }, 'Archived RBAC role and recorded audit log');
    return archived;
  }

  /**
   * Assigns a role to a user within an organization inside an ACID transaction.
   */
  async assignRoleToUser(targetUserId, roleId, actorContext) {
    const { userId: actorId, organizationId } = actorContext;

    const role = await RoleRepository.findByIdAndTenant(roleId, organizationId);
    if (!role || role.status !== 'ACTIVE') throw new NotFoundError('Target role not found or inactive.');

    const actorPriority = await this._getActorHighestPriority(actorId, organizationId);
    if (role.priority <= actorPriority && actorPriority !== 0) {
      throw new ForbiddenError(`You cannot assign a role with priority (${role.priority}) equal to or higher than your own (${actorPriority}).`);
    }

    if (actorContext && actorContext.userId) {
      const canDelegate = await RoleDelegationService.canAssignRoles(actorContext, [role]);
      if (!canDelegate) {
        throw new ForbiddenError('Security violation: Role Delegation Policy forbids you from assigning this role.');
      }
    }

    return await runInTransaction(async (session) => {
      try {
        const assignment = await UserRoleRepository.createScoped({
          userId: targetUserId,
          roleId: role._id,
          assignedBy: actorId
        }, organizationId, { session });

        await RbacService.invalidateUserCache(targetUserId, organizationId);

        await AuditService.logAction({
          organizationId,
          actorId,
          action: 'ROLE_ASSIGNED',
          entityType: 'UserRole',
          entityId: assignment._id,
          newValue: { targetUserId, roleId: role._id, roleName: role.name }
        }, { session });

        logger.info({ targetUserId, roleId, organizationId, assignedBy: actorId }, 'Assigned role to user in transaction with audit log');
        return assignment;
      } catch (err) {
        if (err.code === 11000) {
          throw new ConflictError('User already has this role assigned.');
        }
        throw err;
      }
    });
  }

  /**
   * Removes a role assignment from a user inside an ACID transaction.
   */
  async removeRoleFromUser(targetUserId, roleId, actorContext) {
    const { userId: actorId, organizationId } = actorContext;
    
    const role = await RoleRepository.findByIdAndTenant(roleId, organizationId);
    if (!role) throw new NotFoundError('Role not found.');

    const actorPriority = await this._getActorHighestPriority(actorId, organizationId);
    if (role.priority <= actorPriority && actorPriority !== 0) {
      throw new ForbiddenError('You cannot unassign a role with priority equal to or higher than your own.');
    }

    return await runInTransaction(async (session) => {
      const removed = await UserRoleRepository.removeRoleFromUser(targetUserId, roleId, organizationId, { session });
      if (!removed) throw new NotFoundError('User did not have this role assigned.');

      await RbacService.invalidateUserCache(targetUserId, organizationId);

      await AuditService.logAction({
        organizationId,
        actorId,
        action: 'ROLE_REMOVED',
        entityType: 'UserRole',
        entityId: removed._id,
        previousValue: { targetUserId, roleId: role._id, roleName: role.name }
      }, { session });

      logger.info({ targetUserId, roleId, organizationId }, 'Removed role from user in transaction with audit log');
      return removed;
    });
  }

  async _getActorHighestPriority(userId, organizationId) {
    const userRoles = await UserRoleRepository.findRolesByUser(userId, organizationId);
    if (!userRoles || userRoles.length === 0) return 100;

    let highest = 100;
    for (const ur of userRoles) {
      if (ur.roleId && ur.roleId.priority !== undefined) {
        if (ur.roleId.priority < highest) highest = ur.roleId.priority;
      }
    }
    return highest;
  }
}

export default new RoleService();
