import env from '#@/config/env.js';
import logger from '#@/platform/logger/index.js';
import InviteRepository from '#@/modules/invitations/repositories/InviteRepository.js';
import UserRepository from '#@/modules/users/repositories/UserRepository.js';
import UserRoleRepository from '#@/modules/roles/repositories/UserRoleRepository.js';
import RoleRepository from '#@/modules/roles/repositories/RoleRepository.js';
import TokenService from '#@/modules/auth/services/TokenService.js';
import { runInTransaction } from '#@/platform/database/db.js';
import { hashToken, generateSecureToken, hashPassword, generateUuid } from '#@/core/utils/crypto.js';
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from '#@/core/errors/AppError.js';
import RoleDelegationService from '#@/modules/roles/services/RoleDelegationService.js';
import AuditService from '#@/modules/audit/services/AuditService.js';
import EmployeeRepository from '#@/modules/employees/repositories/EmployeeRepository.js';
import EmploymentHistoryRepository from '#@/modules/employees/repositories/EmploymentHistoryRepository.js';
import EventBus from '#@/core/events/EventBus.js';
import { EVENTS } from '#@/core/constants/events/index.js';

export class InviteService {
  /**
   * Generates a new cryptographic onboarding invitation token and link.
   */
  async createInvitation(data, actorContext) {
    const { email, roleIds, expiresInHours = 48, maxUses = 1 } = data;
    const { userId: actorId, organizationId } = actorContext;

    if (email) {
      const existingUser = await UserRepository.findByEmailAndTenant(email, organizationId);
      if (existingUser) {
        throw new ConflictError('A user account with this email already exists in this organization.');
      }
    }

    const roles = await RoleRepository.findByIdsAndTenant(roleIds, organizationId);
    if (roles.length !== roleIds.length) {
      throw new ValidationError('One or more specified default roles do not exist or are inactive in this organization.');
    }

    const canDelegate = await RoleDelegationService.canAssignRoles(actorContext, roles);
    if (!canDelegate) {
      logger.warn({ actorId, organizationId, roleIds }, 'Role delegation policy check failed during invite creation');
      throw new ForbiddenError('Security violation: Role Delegation Policy forbids you from assigning one or more of the specified roles.');
    }

    const plaintextToken = generateSecureToken(32); // 64 hex characters
    const tokenHash = hashToken(plaintextToken);
    const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000);

    const invite = await InviteRepository.createScoped({
      tokenHash,
      email: email ? email.toLowerCase().trim() : null,
      defaultRoleIds: roleIds,
      issuedBy: actorId,
      maxUses,
      usedCount: 0,
      status: 'ACTIVE',
      expiresAt
    }, organizationId);

    const inviteUrl = `${env.CLIENT_URL}/join?token=${plaintextToken}`;
    logger.info({ inviteId: invite._id, organizationId, issuedBy: actorId }, 'Created onboarding invitation');

    await AuditService.logAction({
      organizationId,
      actorId,
      action: 'INVITATION_CREATED',
      entityType: 'Invitation',
      entityId: invite._id,
      details: { email: invite.email, roleIds }
    });

    return {
      inviteId: invite._id,
      inviteUrl,
      token: plaintextToken,
      expiresAt,
      maxUses
    };
  }

  /**
   * Retrieves all invitations for a tenant.
   */
  async getInvitations(organizationId, filter = {}) {
    return await InviteRepository.find(filter, organizationId, { sort: { createdAt: -1 } });
  }

  /**
   * Revokes an active invitation.
   */
  async revokeInvitation(inviteId, organizationId) {
    const invite = await InviteRepository.findByIdAndTenant(inviteId, organizationId);
    if (!invite) throw new NotFoundError('Invitation not found.');
    if (invite.status === 'REVOKED') throw new ValidationError('Invitation is already revoked.');

    const updated = await InviteRepository.updateStatus(inviteId, 'REVOKED', organizationId);
    await AuditService.logAction({
      organizationId,
      actorId: null,
      action: 'INVITATION_REVOKED',
      entityType: 'Invitation',
      entityId: inviteId,
      details: { status: 'REVOKED' }
    });
    logger.info({ inviteId, organizationId }, 'Revoked onboarding invitation');
    return updated;
  }

  /**
   * Validates an invite token without redeeming it (used by frontend onboarding screen).
   */
  async validateInvitationToken(plaintextToken) {
    if (!plaintextToken || plaintextToken.length !== 64) {
      throw new ValidationError('Invalid invitation token format.');
    }

    const tokenHash = hashToken(plaintextToken);
    const invite = await InviteRepository.findByTokenHash(tokenHash);

    if (!invite) {
      throw new NotFoundError('Invitation link is invalid or does not exist.');
    }

    if (invite.status !== 'ACTIVE') {
      throw new ForbiddenError(`Invitation is no longer active (Status: ${invite.status}).`);
    }

    if (new Date() > invite.expiresAt) {
      await InviteRepository.updateStatus(invite._id, 'EXPIRED', invite.organizationId);
      await AuditService.logAction({
        organizationId: invite.organizationId,
        actorId: null,
        action: 'INVITATION_EXPIRED',
        entityType: 'Invitation',
        entityId: invite._id,
        details: { email: invite.email, expiresAt: invite.expiresAt }
      });
      throw new ForbiddenError('Invitation link has expired.');
    }

    if (invite.usedCount >= invite.maxUses) {
      await InviteRepository.updateStatus(invite._id, 'EXHAUSTED', invite.organizationId);
      throw new ForbiddenError('Invitation link has reached its maximum usage limit.');
    }

    return invite;
  }

  /**
   * Redeems an invitation token inside an ACID transaction to register a new user account under the tenant organization.
   */
  async registerViaInvite(payload, req = {}) {
    const { token, email, password, firstName, lastName } = payload;

    // 1. Validate token liveness
    const invite = await this.validateInvitationToken(token);

    const targetEmail = invite.email || (email ? email.toLowerCase().trim() : null);
    if (!targetEmail) {
      throw new ValidationError('Email address is required for registration.');
    }

    if (invite.email && invite.email !== targetEmail) {
      throw new ForbiddenError(`This invitation is strictly restricted to email address: ${invite.email}`);
    }

    // 2. Check if user already exists in this organization
    const existingUser = await UserRepository.findByEmailAndTenant(targetEmail, invite.organizationId);
    if (existingUser) {
      throw new ConflictError('A user account with this email already exists in this organization.');
    }

    const passwordHash = await hashPassword(password);

    // 3. Execute atomic user registration and role binding inside Mongoose ClientSession transaction
    const newUser = await runInTransaction(async (session) => {
      const createdUser = await UserRepository.createScoped({
        email: targetEmail,
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        status: 'ACTIVE',
        lastLoginAt: new Date()
      }, invite.organizationId, { session });

      for (const roleId of invite.defaultRoleIds) {
        const targetRoleId = roleId._id || roleId;
        await UserRoleRepository.createScoped({
          userId: createdUser._id,
          roleId: targetRoleId,
          assignedBy: invite.issuedBy
        }, invite.organizationId, { session });
      }

      // Link M-03 Employee profile if one exists with matching workEmail
      const employee = await EmployeeRepository.findByEmail(targetEmail, invite.organizationId, { session });
      if (employee) {
        const newStatus = employee.status === 'INVITED' ? 'ACTIVE' : employee.status;
        await EmployeeRepository.updateByIdAndTenant(employee._id, { userId: createdUser._id, status: newStatus }, invite.organizationId, { session });
        if (employee.status !== newStatus) {
          await EmploymentHistoryRepository.appendEntry({
            employeeId: employee._id,
            organizationId: invite.organizationId,
            type: 'STATUS_CHANGE',
            previousValue: { status: employee.status, userId: employee.userId },
            newValue: { status: newStatus, userId: createdUser._id },
            changedBy: createdUser._id,
            changeReason: 'User registered via onboarding invitation'
          }, { session });
          EventBus.emit(EVENTS.EMPLOYEE.STATUS_CHANGED, {
            organizationId: invite.organizationId,
            employeeId: employee._id,
            oldStatus: employee.status,
            newStatus
          });
        }
        EventBus.emit(EVENTS.EMPLOYEE.USER_LINKED, {
          organizationId: invite.organizationId,
          employeeId: employee._id,
          userId: createdUser._id
        });
      }

      const updatedInvite = await InviteRepository.incrementUsedCount(invite._id, invite.organizationId, { session });
      if (updatedInvite.usedCount >= updatedInvite.maxUses) {
        await InviteRepository.updateStatus(invite._id, 'EXHAUSTED', invite.organizationId, { session });
      }

      return createdUser;
    });

    // 4. Issue initial JWT access and refresh tokens after successful transaction commit
    const sessionId = generateUuid();
    const accessToken = await TokenService.generateAccessToken(newUser, sessionId);
    const refreshToken = await TokenService.generateRefreshToken(newUser, req);

    await AuditService.logAction({
      organizationId: invite.organizationId,
      actorId: newUser._id,
      action: 'INVITATION_REDEEMED',
      entityType: 'Invitation',
      entityId: invite._id,
      details: { userId: newUser._id, email: targetEmail }
    });

    logger.info({ userId: newUser._id, organizationId: invite.organizationId, inviteId: invite._id }, 'Successfully registered user via invitation redemption in ACID transaction');

    return {
      accessToken,
      refreshToken,
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        organizationId: newUser.organizationId
      }
    };
  }
}

export default new InviteService();
