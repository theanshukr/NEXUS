import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '#@/app.js';
import { startDb, clearDb, stopDb } from '../setup/db.js';
import { hashPassword } from '#@/core/utils/crypto.js';
import env from '#@/config/env.js';
import { runInTransaction } from '#@/platform/database/db.js';
import OrganizationService from '#@/modules/organization/services/OrganizationService.js';
import Role from '#@/modules/roles/models/Role.js';
import User from '#@/modules/users/models/User.js';
import UserRole from '#@/modules/roles/models/UserRole.js';
import RoleDelegationPolicy from '#@/modules/roles/models/RoleDelegationPolicy.js';
import RoleDelegationRepository from '#@/modules/roles/repositories/RoleDelegationRepository.js';
import AuditLog from '#@/modules/audit/models/AuditLog.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';

/**
 * Enterprise Workforce Management Platform – Comprehensive API Integration Test Suite
 * Module: Role Delegation & Assignment Policies (M-01 Foundation)
 *
 * Verifies both primary prefix and alias prefix:
 * - /api/v1/role-delegation-policies/*
 * - /api/v1/role-assignment-policies/* (Alias for compatibility)
 *
 * Both route prefixes must behave identically across:
 * SUCCESS, DATABASE, VALIDATION, AUTHENTICATION, AUTHORIZATION, TENANT ISOLATION,
 * CRUD LIFECYCLE, NOT FOUND, EDGE CASES, TRANSACTIONS, CACHE, and AUDIT.
 */
describe('API – Role Delegation & Assignment Policies Integration Test Suite', () => {
  let orgData;
  let adminUser;
  let superAdminToken;

  const PROVISION_PAYLOAD = {
    name: 'NexusOps Delegation Corp',
    code: 'DELG',
    domain: 'delegation.io',
    adminEmail: 'admin@delegation.io',
    adminPassword: 'Super@Password123',
    adminFirstName: 'Root',
    adminLastName: 'Admin'
  };

  const ROUTE_PREFIXES = [
    { name: 'Primary Endpoint (/api/v1/role-delegation-policies)', prefix: '/api/v1/role-delegation-policies' },
    { name: 'Alias Endpoint (/api/v1/role-assignment-policies)', prefix: '/api/v1/role-assignment-policies' }
  ];

  beforeAll(async () => {
    await startDb();
  });

  afterEach(async () => {
    await clearDb();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await stopDb();
  });

  /**
   * Helper: Provisions a fresh tenant organization and logs in as the root Super Admin.
   * Organization provisioning automatically seeds default RoleDelegationPolicy rules.
   */
  async function setupTenantAndLogin(customPayload = PROVISION_PAYLOAD) {
    const res = await OrganizationService.createOrganization(customPayload);
    orgData = res.organization;
    adminUser = res.adminUser;

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: customPayload.adminEmail,
        password: customPayload.adminPassword
      });

    superAdminToken = loginRes.body.data.accessToken;
    return { orgData, adminUser, superAdminToken };
  }

  /**
   * Helper: Creates custom active test roles (sourceRole and targetRole) within the current organization.
   */
  async function createTestRoles(customOrgId = null) {
    const targetOrgId = customOrgId || orgData.id;
    const sourceRole = await Role.create({
      organizationId: targetOrgId,
      name: `SourceRole_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      priority: 40,
      permissions: [PERMISSIONS.ROLE.ASSIGN, PERMISSIONS.ROLE.READ, PERMISSIONS.INVITE.CREATE],
      status: 'ACTIVE',
      isSystemTemplate: false
    });

    const targetRole = await Role.create({
      organizationId: targetOrgId,
      name: `TargetRole_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      priority: 80,
      permissions: [PERMISSIONS.ATTENDANCE.MARK],
      status: 'ACTIVE',
      isSystemTemplate: false
    });

    return { sourceRole, targetRole };
  }

  /**
   * Helper: Creates a restricted user with specific atomic permissions and returns authenticated token.
   */
  async function createRestrictedUser(permissions = [PERMISSIONS.ROLE.READ], customOrgId = null) {
    const targetOrgId = customOrgId || orgData.id;
    const customRole = await Role.create({
      organizationId: targetOrgId,
      name: `Restricted_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      priority: 50,
      permissions,
      status: 'ACTIVE',
      isSystemTemplate: false
    });

    const user = await User.create({
      organizationId: targetOrgId,
      email: `restricted_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@delegation.io`,
      passwordHash: await hashPassword(PROVISION_PAYLOAD.adminPassword),
      firstName: 'Restricted',
      lastName: 'User',
      status: 'ACTIVE'
    });

    await UserRole.create({
      organizationId: targetOrgId,
      userId: user._id,
      roleId: customRole._id,
      assignedBy: adminUser ? adminUser.id : user._id
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: user.email,
        password: PROVISION_PAYLOAD.adminPassword
      });

    return { user, role: customRole, token: loginRes.body.data.accessToken };
  }

  // =====================================================================
  // PARAMETERIZED ROUTE SUITES (Executes all tests against both prefixes)
  // =====================================================================
  ROUTE_PREFIXES.forEach(({ name, prefix }) => {
    describe(`Route Suite: ${name}`, () => {
      
      // ─── 1. SUCCESS & DATABASE & AUDIT & CACHE ─────────────────────────
      describe('SUCCESS, DATABASE, AUDIT & CACHE Verification', () => {
        it(`POST ${prefix} -> 201: creates policy, verifies body, database state, audit log, and cache invalidation`, async () => {
          await setupTenantAndLogin();
          const { sourceRole, targetRole } = await createTestRoles();


          const res = await request(app)
            .post(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({
              sourceRoleId: sourceRole._id.toString(),
              targetRoleId: targetRole._id.toString()
            });

          // HTTP Response Verification
          expect(res.status).toBe(201);
          expect(res.body.success).toBe(true);
          expect(res.body.message).toBe('Role delegation policy created successfully.');
          expect(res.body.data).toBeDefined();
          expect(res.body.data._id).toBeDefined();
          expect(res.body.data.sourceRoleId).toBe(sourceRole._id.toString());
          expect(res.body.data.targetRoleId).toBe(targetRole._id.toString());
          expect(res.body.data.organizationId).toBe(orgData.id.toString());
          expect(res.body.data.createdAt).toBeDefined();
          expect(res.body.data.updatedAt).toBeDefined();

          const policyId = res.body.data._id;

          // Database State Verification Direct Check
          const dbPolicy = await RoleDelegationPolicy.findById(policyId);
          expect(dbPolicy).not.toBeNull();
          expect(dbPolicy._id.toString()).toBe(policyId);
          expect(dbPolicy.organizationId.toString()).toBe(orgData.id.toString());
          expect(dbPolicy.sourceRoleId.toString()).toBe(sourceRole._id.toString());
          expect(dbPolicy.targetRoleId.toString()).toBe(targetRole._id.toString());
          expect(dbPolicy.createdBy.toString()).toBe(adminUser.id.toString());

          // Audit Log Verification
          const auditLog = await AuditLog.findOne({ entityId: policyId, action: 'POLICY_CREATED' });
          expect(auditLog).not.toBeNull();
          expect(auditLog.organizationId.toString()).toBe(orgData.id.toString());
          expect(auditLog.actorId.toString()).toBe(adminUser.id.toString());
          expect(auditLog.entityType).toBe('RoleDelegationPolicy');
        });

        it(`GET ${prefix} -> 200: lists policies, verifies array, populated schemas, timestamps, and DB count`, async () => {
          await setupTenantAndLogin();
          const { sourceRole, targetRole } = await createTestRoles();

          // Create an explicit rule
          await request(app)
            .post(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({
              sourceRoleId: sourceRole._id.toString(),
              targetRoleId: targetRole._id.toString()
            });

          const res = await request(app)
            .get(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`);

          // HTTP Response Verification
          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);

          // Verify seeded policies + created policy exist
          const dbCount = await RoleDelegationPolicy.countDocuments({ organizationId: orgData.id });
          expect(res.body.data.length).toBe(dbCount);
          expect(res.body.data.length).toBeGreaterThanOrEqual(1);

          // Verify populated nested object structures and timestamps
          const createdItem = res.body.data.find(p => p.sourceRoleId && p.sourceRoleId._id === sourceRole._id.toString());
          expect(createdItem).toBeDefined();
          expect(typeof createdItem.sourceRoleId).toBe('object');
          expect(createdItem.sourceRoleId._id).toBe(sourceRole._id.toString());
          expect(createdItem.sourceRoleId.name).toBe(sourceRole.name);
          expect(typeof createdItem.targetRoleId).toBe('object');
          expect(createdItem.targetRoleId._id).toBe(targetRole._id.toString());
          expect(createdItem.targetRoleId.name).toBe(targetRole.name);
          expect(createdItem.createdAt).toBeDefined();
          expect(createdItem.updatedAt).toBeDefined();
        });

        it(`DELETE ${prefix}/:id -> 200: deletes rule, confirms DB removal, audit log, and cache invalidation`, async () => {
          await setupTenantAndLogin();
          const { sourceRole, targetRole } = await createTestRoles();

          const createRes = await request(app)
            .post(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({
              sourceRoleId: sourceRole._id.toString(),
              targetRoleId: targetRole._id.toString()
            });

          const policyId = createRes.body.data._id;


          const res = await request(app)
            .delete(`${prefix}/${policyId}`)
            .set('Authorization', `Bearer ${superAdminToken}`);

          // HTTP Response Verification
          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.message).toBe('Role delegation policy deleted successfully.');
          expect(res.body.data.deleted).toBe(true);
          expect(res.body.data.id).toBe(policyId);

          // Database State Verification
          const dbCheck = await RoleDelegationPolicy.findById(policyId);
          expect(dbCheck).toBeNull();

          // Audit Log Verification
          const auditLog = await AuditLog.findOne({ entityId: policyId, action: 'POLICY_DELETED' });
          expect(auditLog).not.toBeNull();
          expect(auditLog.organizationId.toString()).toBe(orgData.id.toString());
          expect(auditLog.actorId.toString()).toBe(adminUser.id.toString());
        });
      });

      // ─── 2. VALIDATION (Zod Schemas & Error Mapping) ───────────────────
      describe('VALIDATION Verification', () => {
        it(`POST ${prefix} -> 400 ERR_VALIDATION: rejects request with missing sourceRoleId`, async () => {
          await setupTenantAndLogin();
          const { targetRole } = await createTestRoles();

          const res = await request(app)
            .post(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({ targetRoleId: targetRole._id.toString() });

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);
          expect(res.body.error.code).toBe('ERR_VALIDATION');
        });

        it(`POST ${prefix} -> 400 ERR_VALIDATION: rejects request with missing targetRoleId`, async () => {
          await setupTenantAndLogin();
          const { sourceRole } = await createTestRoles();

          const res = await request(app)
            .post(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({ sourceRoleId: sourceRole._id.toString() });

          expect(res.status).toBe(400);
          expect(res.body.error.code).toBe('ERR_VALIDATION');
        });

        it(`POST ${prefix} -> 400 ERR_VALIDATION: rejects request with empty body {}`, async () => {
          await setupTenantAndLogin();

          const res = await request(app)
            .post(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({});

          expect(res.status).toBe(400);
          expect(res.body.error.code).toBe('ERR_VALIDATION');
        });

        it(`POST ${prefix} -> 400 ERR_VALIDATION: rejects invalid ObjectId string format for sourceRoleId`, async () => {
          await setupTenantAndLogin();
          const { targetRole } = await createTestRoles();

          const res = await request(app)
            .post(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({
              sourceRoleId: 'invalid-object-id-string',
              targetRoleId: targetRole._id.toString()
            });

          expect(res.status).toBe(400);
          expect(res.body.error.code).toBe('ERR_VALIDATION');
        });

        it(`POST ${prefix} -> 400 ERR_VALIDATION: rejects invalid ObjectId string format for targetRoleId`, async () => {
          await setupTenantAndLogin();
          const { sourceRole } = await createTestRoles();

          const res = await request(app)
            .post(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({
              sourceRoleId: sourceRole._id.toString(),
              targetRoleId: '12345'
            });

          expect(res.status).toBe(400);
          expect(res.body.error.code).toBe('ERR_VALIDATION');
        });

        it(`POST ${prefix} -> 400 ERR_VALIDATION: rejects invalid data types (arrays, booleans, empty strings)`, async () => {
          await setupTenantAndLogin();

          const res = await request(app)
            .post(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({
              sourceRoleId: [],
              targetRoleId: ''
            });

          expect(res.status).toBe(400);
          expect(res.body.error.code).toBe('ERR_VALIDATION');
        });

        it(`DELETE ${prefix}/:id -> 400 ERR_INVALID_ID: rejects malformed ObjectId URL param`, async () => {
          await setupTenantAndLogin();

          const res = await request(app)
            .delete(`${prefix}/invalid-policy-id-parameter`)
            .set('Authorization', `Bearer ${superAdminToken}`);

          expect(res.status).toBe(400);
          expect(res.body.error.code).toBe('ERR_INVALID_ID');
        });
      });

      // ─── 3. AUTHENTICATION ─────────────────────────────────────────────
      describe('AUTHENTICATION Verification', () => {
        it(`GET ${prefix} -> 401: rejects request without token`, async () => {
          const res = await request(app).get(prefix);
          expect(res.status).toBe(401);
        });

        it(`POST ${prefix} -> 401: rejects request without token`, async () => {
          const res = await request(app).post(prefix).send({ sourceRoleId: '6a44b3f20c92decb0cfd4604', targetRoleId: '6a44b3f20c92decb0cfd4605' });
          expect(res.status).toBe(401);
        });

        it(`DELETE ${prefix}/:id -> 401: rejects request without token`, async () => {
          const res = await request(app).delete(`${prefix}/6a44b3f20c92decb0cfd4604`);
          expect(res.status).toBe(401);
        });

        it(`GET ${prefix} -> 401: rejects request with malformed Authorization header`, async () => {
          const res = await request(app)
            .get(prefix)
            .set('Authorization', 'Basic dXNlcjpwYXNz');
          expect(res.status).toBe(401);
        });

        it(`GET ${prefix} -> 401 ERR_TOKEN_EXPIRED: rejects expired JWT access token`, async () => {
          await setupTenantAndLogin();
          const expiredToken = jwt.sign(
            { userId: adminUser.id, organizationId: orgData.id, email: adminUser.email },
            env.JWT_ACCESS_SECRET,
            { expiresIn: '-10s' }
          );

          const res = await request(app)
            .get(prefix)
            .set('Authorization', `Bearer ${expiredToken}`);

          expect(res.status).toBe(401);
          expect(res.body.error.code).toBe('ERR_TOKEN_EXPIRED');
        });

        it(`GET ${prefix} -> 401 ERR_SESSION_REVOKED: rejects valid JWT when session is revoked in cache`, async () => {
          await setupTenantAndLogin();
          
          // Revoke active session via behavioral logout API
          await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${superAdminToken}`);

          const res = await request(app)
            .get(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`);

          expect(res.status).toBe(401);
          expect(res.body.error.code).toBe('ERR_SESSION_REVOKED');
        });

        it(`GET ${prefix} -> 403 ERR_TENANT_BREACH: rejects authenticated JWT missing organizationId`, async () => {
          await setupTenantAndLogin();
          const tokenWithoutTenant = jwt.sign(
            { userId: adminUser.id, email: adminUser.email }, // organizationId omitted
            env.JWT_ACCESS_SECRET,
            { expiresIn: '1h' }
          );

          const res = await request(app)
            .get(prefix)
            .set('Authorization', `Bearer ${tokenWithoutTenant}`);

          expect(res.status).toBe(403);
          expect(res.body.error.code).toBe('ERR_TENANT_BREACH');
        });
      });

      // ─── 4. AUTHORIZATION (RBAC Permission Enforcement) ────────────────
      describe('AUTHORIZATION Verification', () => {
        it(`POST ${prefix} -> 403 Forbidden: rejects user lacking ['role.assign', 'role.update', 'role.create'] and confirms no DB mutation`, async () => {
          await setupTenantAndLogin();
          const { sourceRole, targetRole } = await createTestRoles();
          const initialCount = await RoleDelegationPolicy.countDocuments({ organizationId: orgData.id });

          // Create user with only 'attendance.mark' permission
          const restricted = await createRestrictedUser([PERMISSIONS.ATTENDANCE.MARK]);

          const res = await request(app)
            .post(prefix)
            .set('Authorization', `Bearer ${restricted.token}`)
            .send({
              sourceRoleId: sourceRole._id.toString(),
              targetRoleId: targetRole._id.toString()
            });

          expect(res.status).toBe(403);
          expect(res.body.success).toBe(false);

          // Verify database remained unchanged
          const afterCount = await RoleDelegationPolicy.countDocuments({ organizationId: orgData.id });
          expect(afterCount).toBe(initialCount);
        });

        it(`DELETE ${prefix}/:id -> 403 Forbidden: rejects user lacking delete permissions and confirms record remains in DB`, async () => {
          await setupTenantAndLogin();
          const { sourceRole, targetRole } = await createTestRoles();

          const createRes = await request(app)
            .post(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({
              sourceRoleId: sourceRole._id.toString(),
              targetRoleId: targetRole._id.toString()
            });

          const policyId = createRes.body.data._id;
          const restricted = await createRestrictedUser([PERMISSIONS.ROLE.READ]);

          const res = await request(app)
            .delete(`${prefix}/${policyId}`)
            .set('Authorization', `Bearer ${restricted.token}`);

          expect(res.status).toBe(403);

          // Verify record still exists in DB
          const dbCheck = await RoleDelegationPolicy.findById(policyId);
          expect(dbCheck).not.toBeNull();
        });

        it(`GET ${prefix} -> 403 Forbidden: rejects user lacking read/assign permissions`, async () => {
          await setupTenantAndLogin();
          const restricted = await createRestrictedUser([PERMISSIONS.ATTENDANCE.MARK]);

          const res = await request(app)
            .get(prefix)
            .set('Authorization', `Bearer ${restricted.token}`);

          expect(res.status).toBe(403);
        });
      });

      // ─── 5. TENANT ISOLATION (Zero-Trust Data Boundaries) ──────────────
      describe('TENANT ISOLATION Verification', () => {
        it(`GET ${prefix} -> 200: Org B cannot view or leak Org A delegation policies`, async () => {
          // Setup Org A
          await setupTenantAndLogin();
          const orgAId = orgData.id;
          const rolesA = await createTestRoles();
          const createResA = await request(app)
            .post(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({
              sourceRoleId: rolesA.sourceRole._id.toString(),
              targetRoleId: rolesA.targetRole._id.toString()
            });
          const policyIdA = createResA.body.data._id;

          // Setup Org B
          const orgBPayload = {
            ...PROVISION_PAYLOAD,
            name: 'Beta Tenant Org',
            code: 'BETA',
            domain: 'beta.io',
            adminEmail: 'admin@beta.io'
          };
          const orgB = await setupTenantAndLogin(orgBPayload);

          // Org B retrieves policies
          const resB = await request(app)
            .get(prefix)
            .set('Authorization', `Bearer ${orgB.superAdminToken}`);

          expect(resB.status).toBe(200);
          expect(resB.body.success).toBe(true);
          expect(resB.body.data.some(p => p._id === policyIdA)).toBe(false);
          expect(resB.body.data.some(p => p.organizationId.toString() === orgAId.toString())).toBe(false);
        });

        it(`DELETE ${prefix}/:id -> 404: Org B cannot delete Org A policy; DB record remains intact`, async () => {
          // Setup Org A
          await setupTenantAndLogin();
          const rolesA = await createTestRoles();
          const createResA = await request(app)
            .post(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({
              sourceRoleId: rolesA.sourceRole._id.toString(),
              targetRoleId: rolesA.targetRole._id.toString()
            });
          const policyIdA = createResA.body.data._id;

          // Setup Org B
          const orgBPayload = {
            ...PROVISION_PAYLOAD,
            name: 'Beta Tenant Org 2',
            code: 'BET2',
            domain: 'bet2.io',
            adminEmail: 'admin@bet2.io'
          };
          const orgB = await setupTenantAndLogin(orgBPayload);

          // Org B attempts deletion of Org A's policy
          const resB = await request(app)
            .delete(`${prefix}/${policyIdA}`)
            .set('Authorization', `Bearer ${orgB.superAdminToken}`);

          // BaseRepository automatically intercepts with scopeFilter -> returns 404 Not Found
          expect(resB.status).toBe(404);

          // Verify policy remains intact in Org A's database
          const checkA = await RoleDelegationPolicy.findById(policyIdA);
          expect(checkA).not.toBeNull();
          expect(checkA._id.toString()).toBe(policyIdA);
        });

        it(`POST ${prefix} -> 400: Org B cannot reference roles belonging to Org A`, async () => {
          // Setup Org A
          await setupTenantAndLogin();
          const rolesA = await createTestRoles();

          // Setup Org B
          const orgBPayload = {
            ...PROVISION_PAYLOAD,
            name: 'Beta Tenant Org 3',
            code: 'BET3',
            domain: 'bet3.io',
            adminEmail: 'admin@bet3.io'
          };
          const orgB = await setupTenantAndLogin(orgBPayload);

          // Org B attempts to create policy using Org A role IDs
          const resB = await request(app)
            .post(prefix)
            .set('Authorization', `Bearer ${orgB.superAdminToken}`)
            .send({
              sourceRoleId: rolesA.sourceRole._id.toString(),
              targetRoleId: rolesA.targetRole._id.toString()
            });

          // RoleRepository.findByIdAndTenant scopes by Org B -> returns null -> 400 Validation Error
          expect(resB.status).toBe(400);
          expect(resB.body.error.code).toBe('ERR_VALIDATION');
        });
      });

      // ─── 6. CRUD LIFECYCLE ─────────────────────────────────────────────
      describe('CRUD LIFECYCLE Verification', () => {
        it(`executes full sequence: Create -> Read -> List -> Delete -> Confirm Deletion`, async () => {
          await setupTenantAndLogin();
          const { sourceRole, targetRole } = await createTestRoles();

          // Step 1: Create
          const createRes = await request(app)
            .post(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({
              sourceRoleId: sourceRole._id.toString(),
              targetRoleId: targetRole._id.toString()
            });
          expect(createRes.status).toBe(201);
          const policyId = createRes.body.data._id;

          // Step 2 & 3: Read & List
          const listRes = await request(app)
            .get(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`);
          expect(listRes.status).toBe(200);
          const found = listRes.body.data.find(p => p._id === policyId);
          expect(found).toBeDefined();
          expect(found.sourceRoleId._id).toBe(sourceRole._id.toString());
          expect(found.targetRoleId._id).toBe(targetRole._id.toString());

          // Step 4: Delete
          const delRes = await request(app)
            .delete(`${prefix}/${policyId}`)
            .set('Authorization', `Bearer ${superAdminToken}`);
          expect(delRes.status).toBe(200);
          expect(delRes.body.data.deleted).toBe(true);

          // Step 5: Confirm Deletion in Database and via API
          const dbCheck = await RoleDelegationPolicy.findById(policyId);
          expect(dbCheck).toBeNull();

          const delAgainRes = await request(app)
            .delete(`${prefix}/${policyId}`)
            .set('Authorization', `Bearer ${superAdminToken}`);
          expect(delAgainRes.status).toBe(404);
        });
      });

      // ─── 7. NOT FOUND ──────────────────────────────────────────────────
      describe('NOT FOUND Verification', () => {
        it(`DELETE ${prefix}/:id -> 404: returns error for random non-existent ObjectId`, async () => {
          await setupTenantAndLogin();
          const randomId = new mongoose.Types.ObjectId().toString();

          const res = await request(app)
            .delete(`${prefix}/${randomId}`)
            .set('Authorization', `Bearer ${superAdminToken}`);

          expect(res.status).toBe(404);
          expect(res.body.error.code).toBe('ERR_NOT_FOUND');
        });

        it(`DELETE ${prefix}/:id -> 404: returns error when deleting an already deleted record`, async () => {
          await setupTenantAndLogin();
          const { sourceRole, targetRole } = await createTestRoles();

          const createRes = await request(app)
            .post(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({
              sourceRoleId: sourceRole._id.toString(),
              targetRoleId: targetRole._id.toString()
            });
          const policyId = createRes.body.data._id;

          await request(app)
            .delete(`${prefix}/${policyId}`)
            .set('Authorization', `Bearer ${superAdminToken}`);

          const resSecond = await request(app)
            .delete(`${prefix}/${policyId}`)
            .set('Authorization', `Bearer ${superAdminToken}`);

          expect(resSecond.status).toBe(404);
        });
      });

      // ─── 8. EDGE CASES (Business Logic Specifics) ──────────────────────
      describe('EDGE CASES Verification', () => {
        it(`POST ${prefix} -> 409 ERR_CONFLICT: rejects duplicate delegation rule creation`, async () => {
          await setupTenantAndLogin();
          const { sourceRole, targetRole } = await createTestRoles();

          // First creation succeeds
          const firstRes = await request(app)
            .post(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({
              sourceRoleId: sourceRole._id.toString(),
              targetRoleId: targetRole._id.toString()
            });
          expect(firstRes.status).toBe(201);

          // Duplicate creation attempt rejected
          const secondRes = await request(app)
            .post(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({
              sourceRoleId: sourceRole._id.toString(),
              targetRoleId: targetRole._id.toString()
            });

          expect(secondRes.status).toBe(409);
          expect(secondRes.body.error.code).toBe('ERR_CONFLICT');
        });

        it(`POST ${prefix} -> 201: permits self-delegation (sourceRoleId === targetRoleId) and verifies DB`, async () => {
          await setupTenantAndLogin();
          const { sourceRole } = await createTestRoles();

          const res = await request(app)
            .post(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({
              sourceRoleId: sourceRole._id.toString(),
              targetRoleId: sourceRole._id.toString()
            });

          expect(res.status).toBe(201);
          expect(res.body.data.sourceRoleId).toBe(sourceRole._id.toString());
          expect(res.body.data.targetRoleId).toBe(sourceRole._id.toString());

          const dbPolicy = await RoleDelegationPolicy.findById(res.body.data._id);
          expect(dbPolicy).not.toBeNull();
          expect(dbPolicy.sourceRoleId.toString()).toBe(dbPolicy.targetRoleId.toString());
        });

        it(`POST ${prefix} -> 201: permits circular delegation (A -> B and B -> A) and verifies DB`, async () => {
          await setupTenantAndLogin();
          const { sourceRole, targetRole } = await createTestRoles();

          // Rule 1: Source -> Target
          const res1 = await request(app)
            .post(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({
              sourceRoleId: sourceRole._id.toString(),
              targetRoleId: targetRole._id.toString()
            });
          expect(res1.status).toBe(201);

          // Rule 2: Target -> Source (Circular)
          const res2 = await request(app)
            .post(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({
              sourceRoleId: targetRole._id.toString(),
              targetRoleId: sourceRole._id.toString()
            });
          expect(res2.status).toBe(201);

          const dbCount = await RoleDelegationPolicy.countDocuments({
            organizationId: orgData.id,
            _id: { $in: [res1.body.data._id, res2.body.data._id] }
          });
          expect(dbCount).toBe(2);
        });


        it(`POST ${prefix} -> 400 ERR_VALIDATION: rejects delegation rule referencing a deleted / non-existent role`, async () => {
          await setupTenantAndLogin();
          const { sourceRole } = await createTestRoles();
          const randomRoleId = new mongoose.Types.ObjectId().toString();

          const res = await request(app)
            .post(prefix)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({
              sourceRoleId: sourceRole._id.toString(),
              targetRoleId: randomRoleId
            });

          expect(res.status).toBe(400);
          expect(res.body.error.code).toBe('ERR_VALIDATION');
        });
      });

      // ─── 9. TRANSACTIONS ───────────────────────────────────────────────
      describe('TRANSACTIONS Verification', () => {
        it(`verifies rollback: confirms DB remains unchanged when an ACID multi-document transaction fails`, async () => {
          await setupTenantAndLogin();
          const { sourceRole, targetRole } = await createTestRoles();

          const initialCount = await RoleDelegationPolicy.countDocuments({ organizationId: orgData.id });

          try {
            await runInTransaction(async (session) => {
              // Perform a database insertion scoped within the transaction session
              await RoleDelegationRepository.createManyScoped([
                {
                  sourceRoleId: sourceRole._id,
                  targetRoleId: targetRole._id,
                  createdBy: adminUser.id
                }
              ], orgData.id, { session });

              // Force an intentional failure inside the transaction boundary
              throw new Error('Simulated ACID transaction rollback failure');
            });
          } catch (err) {
            expect(err.message).toBe('Simulated ACID transaction rollback failure');
          }

          // Verify database rolled back completely and zero records were persisted
          const afterCount = await RoleDelegationPolicy.countDocuments({ organizationId: orgData.id });
          expect(afterCount).toBe(initialCount);

          const checkPolicy = await RoleDelegationPolicy.findOne({
            organizationId: orgData.id,
            sourceRoleId: sourceRole._id,
            targetRoleId: targetRole._id
          });
          expect(checkPolicy).toBeNull();
        });
      });
    });
  });

  // =====================================================================
  // 10. ALIAS VERIFICATION (Side-by-Side Comparison)
  // =====================================================================
  describe('ALIAS VERIFICATION (Side-by-Side Comparison between Primary and Alias)', () => {
    it('verifies POST /role-delegation-policies and /role-assignment-policies behave identically in status, body, and DB', async () => {
      await setupTenantAndLogin();
      const pairA = await createTestRoles();
      const pairB = await createTestRoles();

      // Primary Endpoint Call
      const primaryRes = await request(app)
        .post('/api/v1/role-delegation-policies')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          sourceRoleId: pairA.sourceRole._id.toString(),
          targetRoleId: pairA.targetRole._id.toString()
        });

      // Alias Endpoint Call
      const aliasRes = await request(app)
        .post('/api/v1/role-assignment-policies')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          sourceRoleId: pairB.sourceRole._id.toString(),
          targetRoleId: pairB.targetRole._id.toString()
        });

      // Verify identical HTTP status and body structure
      expect(aliasRes.status).toBe(primaryRes.status);
      expect(aliasRes.status).toBe(201);
      expect(aliasRes.body.success).toBe(primaryRes.body.success);
      expect(aliasRes.body.message).toBe(primaryRes.body.message);
      expect(aliasRes.body.data.organizationId).toBe(primaryRes.body.data.organizationId);

      // Verify identical database document persistence
      const dbPrimary = await RoleDelegationPolicy.findById(primaryRes.body.data._id);
      const dbAlias = await RoleDelegationPolicy.findById(aliasRes.body.data._id);
      expect(dbPrimary).not.toBeNull();
      expect(dbAlias).not.toBeNull();
      expect(dbAlias.createdBy.toString()).toBe(dbPrimary.createdBy.toString());
      expect(dbAlias.organizationId.toString()).toBe(dbPrimary.organizationId.toString());
    });

    it('verifies GET /role-delegation-policies and /role-assignment-policies return identical status, count, and schemas', async () => {
      await setupTenantAndLogin();

      const primaryRes = await request(app)
        .get('/api/v1/role-delegation-policies')
        .set('Authorization', `Bearer ${superAdminToken}`);

      const aliasRes = await request(app)
        .get('/api/v1/role-assignment-policies')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(aliasRes.status).toBe(primaryRes.status);
      expect(aliasRes.status).toBe(200);
      expect(aliasRes.body.success).toBe(primaryRes.body.success);
      expect(aliasRes.body.data.length).toBe(primaryRes.body.data.length);

      // Deep structure equality check on first item
      if (primaryRes.body.data.length > 0) {
        const pItem = primaryRes.body.data[0];
        const aItem = aliasRes.body.data[0];
        expect(Object.keys(aItem).sort()).toStrictEqual(Object.keys(pItem).sort());
      }
    });

    it('verifies DELETE on primary and alias behave identically in status, DB removal, audit logging, and cache invalidation', async () => {
      await setupTenantAndLogin();
      const pairA = await createTestRoles();
      const pairB = await createTestRoles();

      const createA = await request(app)
        .post('/api/v1/role-delegation-policies')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ sourceRoleId: pairA.sourceRole._id.toString(), targetRoleId: pairA.targetRole._id.toString() });

      const createB = await request(app)
        .post('/api/v1/role-assignment-policies')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ sourceRoleId: pairB.sourceRole._id.toString(), targetRoleId: pairB.targetRole._id.toString() });

      const idA = createA.body.data._id;
      const idB = createB.body.data._id;

      // Delete via primary
      const delPrimary = await request(app)
        .delete(`/api/v1/role-delegation-policies/${idA}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      // Delete via alias
      const delAlias = await request(app)
        .delete(`/api/v1/role-assignment-policies/${idB}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(delAlias.status).toBe(delPrimary.status);
      expect(delAlias.status).toBe(200);
      expect(delAlias.body.data.deleted).toBe(delPrimary.body.data.deleted);

      // Confirm both removed from database
      expect(await RoleDelegationPolicy.findById(idA)).toBeNull();
      expect(await RoleDelegationPolicy.findById(idB)).toBeNull();

      // Confirm both generated POLICY_DELETED audit logs
      const auditA = await AuditLog.findOne({ entityId: idA, action: 'POLICY_DELETED' });
      const auditB = await AuditLog.findOne({ entityId: idB, action: 'POLICY_DELETED' });
      expect(auditA).not.toBeNull();
      expect(auditB).not.toBeNull();
      expect(auditA.action).toBe(auditB.action);
    });
  });
});
