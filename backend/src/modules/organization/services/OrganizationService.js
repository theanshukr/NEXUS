import logger from '#@/platform/logger/index.js';
import OrganizationRepository from '#@/modules/organization/repositories/OrganizationRepository.js';
import OrganizationSettingsRepository from '#@/modules/organization/repositories/OrganizationSettingsRepository.js';
import UserRepository from '#@/modules/users/repositories/UserRepository.js';
import UserRoleRepository from '#@/modules/roles/repositories/UserRoleRepository.js';
import RoleService from '#@/modules/roles/services/RoleService.js';
import RoleDelegationService from '#@/modules/roles/services/RoleDelegationService.js';
import AuditService from '#@/modules/audit/services/AuditService.js';
import { runInTransaction } from '#@/platform/database/db.js';
import { hashPassword } from '#@/core/utils/crypto.js';
import { ConflictError } from '#@/core/errors/AppError.js';
import EventBus from '#@/core/events/EventBus.js';
import EVENTS from '#@/core/constants/events/index.js';

export class OrganizationService {
  /**
   * Provisions a new multi-tenant organization inside an ACID transaction.
   * Orchestrates tenant record creation, lean settings initialization, system role template seeding,
   * root Super Admin user creation, and immutable audit logging.
   */
  async createOrganization(payload) {
    const { code } = payload;

    // 1. Validate organization code uniqueness outside transaction
    const existingOrg = await OrganizationRepository.findByCode(code);
    if (existingOrg) {
      throw new ConflictError(`An organization with the code '${code.toUpperCase()}' already exists.`);
    }

    // 2. Execute atomic onboarding workflow inside Mongoose ClientSession transaction
    const result = await runInTransaction(async (session) => {
      logger.info('Starting _createOrganizationRecord');
      const org = await this._createOrganizationRecord(payload, session);
      logger.info('Finished _createOrganizationRecord, starting _createSettings');
      const settings = await this._createSettings(org._id, payload, session);
      logger.info('Finished _createSettings, starting _createDefaultRoles');
      const systemRoles = await this._createDefaultRoles(org._id, session);
      logger.info('Finished _createDefaultRoles, starting _createOwner');
      const superAdminRole = systemRoles.find(r => r.name === 'Super Admin' || r.priority === 0);
      const adminUser = await this._createOwner(org._id, superAdminRole?._id, payload, session);
      logger.info('Finished _createOwner, logging audit action');

      // Record immutable audit log entry for tenant provisioning
      await AuditService.logAction({
        organizationId: org._id,
        actorId: adminUser._id,
        action: 'TENANT_PROVISIONED',
        entityType: 'Organization',
        entityId: org._id,
        newValue: { name: org.name, code: org.code, domain: org.domain, adminEmail: adminUser.email }
      }, { session });

      logger.info({ organizationId: org._id, adminUserId: adminUser._id }, 'Successfully provisioned tenant, settings, root Super Admin, and audit log inside ACID transaction');

      return {
        organization: {
          id: org._id,
          name: org.name,
          code: org.code,
          domain: org.domain
        },
        settings: {
          id: settings._id,
          timezone: settings.timezone,
          currency: settings.currency,
          ai: settings.ai
        },
        adminUser: {
          id: adminUser._id,
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          role: superAdminRole ? superAdminRole.name : 'Super Admin'
        }
      };
    });

    // 3. Publish TENANT_PROVISIONED event after successful transaction commit
    EventBus.emit(EVENTS.TENANT.PROVISIONED, {
      organizationId: result.organization.id,
      adminUserId: result.adminUser.id
    });

    return result;
  }

  async _createOrganizationRecord(payload, session) {
    const org = await OrganizationRepository.create({
      name: payload.name.trim(),
      code: payload.code.toUpperCase().trim(),
      domain: payload.domain ? payload.domain.toLowerCase().trim() : null,
      status: 'ACTIVE'
    }, { session });
    logger.info({ organizationId: org._id, code: org.code }, 'Created organization tenant record');
    return org;
  }

  async _createSettings(organizationId, payload, session) {
    const settings = await OrganizationSettingsRepository.createScoped({
      timezone: payload.timezone || 'UTC',
      currency: payload.currency || 'USD',
      dateFormat: payload.dateFormat || 'YYYY-MM-DD',
      ai: {
        enabled: true,
        provider: 'groq',
        model: 'llama-3.3-70b'
      },
      enabledModules: ['EMPLOYEE', 'ATTENDANCE', 'LEAVE', 'AI_COPILOT']
    }, organizationId, { session });
    logger.info({ organizationId, settingsId: settings._id }, 'Created lean OrganizationSettings record');
    return settings;
  }

  async _createDefaultRoles(organizationId, session) {
    const roles = await RoleService.provisionSystemTemplates(organizationId, { session });
    await RoleDelegationService.seedDefaultPolicies(organizationId, roles, { session });
    return roles;
  }

  async _createOwner(organizationId, superAdminRoleId, payload, session) {
    const passwordHash = await hashPassword(payload.adminPassword);
    const adminUser = await UserRepository.createScoped({
      email: payload.adminEmail.toLowerCase().trim(),
      passwordHash,
      firstName: payload.adminFirstName.trim(),
      lastName: payload.adminLastName.trim(),
      status: 'ACTIVE',
      lastLoginAt: new Date()
    }, organizationId, { session });

    if (superAdminRoleId) {
      await UserRoleRepository.createScoped({
        userId: adminUser._id,
        roleId: superAdminRoleId,
        assignedBy: adminUser._id // Self-assigned during onboarding
      }, organizationId, { session });
    }

    return adminUser;
  }

  async getOrganization(organizationId) {
    return await OrganizationRepository.findById(organizationId);
  }
}

export default new OrganizationService();
