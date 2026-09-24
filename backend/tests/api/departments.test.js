import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '#@/app.js';
import { startDb, clearDb, stopDb } from '../setup/db.js';
import { hashPassword } from '#@/core/utils/crypto.js';
import OrganizationService from '#@/modules/organization/services/OrganizationService.js';
import Role from '#@/modules/roles/models/Role.js';
import User from '#@/modules/users/models/User.js';
import UserRole from '#@/modules/roles/models/UserRole.js';
import PERMISSIONS from '#@/core/constants/permissions/index.js';

describe('API – Department Endpoints (/api/v1/departments)', () => {
  let orgData;
  let adminUser;
  let superAdminToken;

  const PROVISION_PAYLOAD = {
    name: 'NexusOps Dept Corp',
    code: 'DEPT',
    domain: 'dept.io',
    adminEmail: 'admin@dept.io',
    adminPassword: 'Super@Password123',
    adminFirstName: 'Root',
    adminLastName: 'Admin'
  };

  beforeAll(async () => {
    await startDb();
  });

  afterEach(async () => {
    await clearDb();
  });

  afterAll(async () => {
    await stopDb();
  });

  async function setupTenantAndLogin() {
    const res = await OrganizationService.createOrganization(PROVISION_PAYLOAD);
    orgData = res.organization;
    adminUser = res.adminUser;

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: PROVISION_PAYLOAD.adminEmail,
        password: PROVISION_PAYLOAD.adminPassword
      });

    superAdminToken = loginRes.body.data.accessToken;
  }

  async function createRestrictedUser(permissions = [PERMISSIONS.DEPARTMENT.READ]) {
    const customRole = await Role.create({
      organizationId: orgData.id,
      name: `Restricted_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      priority: 50,
      permissions,
      status: 'ACTIVE'
    });

    const user = await User.create({
      organizationId: orgData.id,
      email: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@dept.io`,
      passwordHash: await hashPassword(PROVISION_PAYLOAD.adminPassword),
      firstName: 'Restricted',
      lastName: 'User',
      status: 'ACTIVE'
    });

    await UserRole.create({
      organizationId: orgData.id,
      userId: user._id,
      roleId: customRole._id,
      assignedBy: adminUser.id
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: user.email,
        password: PROVISION_PAYLOAD.adminPassword
      });

    return { user, role: customRole, token: loginRes.body.data.accessToken };
  }

  it('401: blocks unauthenticated requests to department endpoints', async () => {
    const res = await request(app).get('/api/v1/departments');
    expect(res.status).toBe(401);
  });

  it('403: blocks requests when user lacks department.create permission', async () => {
    await setupTenantAndLogin();
    const { token } = await createRestrictedUser([PERMISSIONS.DEPARTMENT.READ]);

    const res = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: 'ENG',
        name: 'Engineering'
      });

    expect(res.status).toBe(403);
  });

  it('400: fails validation when department code is invalid (lowercase or special characters)', async () => {
    await setupTenantAndLogin();

    const res = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        code: 'eng-invalid!@#',
        name: 'Engineering'
      });

    expect(res.status).toBe(400);
  });

  it('201 & 200: executes full department CRUD and tree generation lifecycle', async () => {
    await setupTenantAndLogin();

    // 1. Create root department
    const createRes = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        code: 'ENG',
        name: 'Engineering',
        description: 'Global Engineering Group'
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.code).toBe('ENG');
    const rootId = createRes.body.data._id;

    // 2. Create child department
    const childRes = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        code: 'DEV',
        name: 'Software Development',
        parentDepartmentId: rootId
      });

    expect(childRes.status).toBe(201);
    expect(childRes.body.data.level).toBe(1);
    const childId = childRes.body.data._id;

    // 3. Get tree hierarchy
    const treeRes = await request(app)
      .get('/api/v1/departments/tree')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(treeRes.status).toBe(200);
    // Tree should include GEN (from bootstrap) and ENG (which has child DEV)
    const engNode = treeRes.body.data.find(d => d.code === 'ENG');
    expect(engNode).toBeDefined();
    expect(engNode.children).toHaveLength(1);
    expect(engNode.children[0].code).toBe('DEV');

    // 4. Update department
    const updateRes = await request(app)
      .put(`/api/v1/departments/${childId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Core Software Development'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.name).toBe('Core Software Development');

    // 5. Move department (to root)
    const moveRes = await request(app)
      .post(`/api/v1/departments/${childId}/move`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        parentDepartmentId: null
      });

    expect(moveRes.status).toBe(200);
    expect(moveRes.body.data.level).toBe(0);

    // 6. Archive department
    const delRes = await request(app)
      .delete(`/api/v1/departments/${childId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        reason: 'Restructuring'
      });

    expect(delRes.status).toBe(200);
    expect(delRes.body.data.status).toBe('ARCHIVED');
  });

  it('401: blocks unauthenticated requests across all individual department endpoints', async () => {
    const endpoints = [
      { method: 'get', url: '/api/v1/departments' },
      { method: 'get', url: '/api/v1/departments/tree' },
      { method: 'get', url: '/api/v1/departments/select-options' },
      { method: 'get', url: '/api/v1/departments/6a4655b5e41f93f4262ca9ba' },
      { method: 'post', url: '/api/v1/departments', send: { code: 'X', name: 'X' } },
      { method: 'put', url: '/api/v1/departments/6a4655b5e41f93f4262ca9ba', send: { name: 'Y' } },
      { method: 'post', url: '/api/v1/departments/6a4655b5e41f93f4262ca9ba/move', send: { parentDepartmentId: null } },
      { method: 'delete', url: '/api/v1/departments/6a4655b5e41f93f4262ca9ba', send: { reason: 'Z' } }
    ];

    for (const ep of endpoints) {
      const res = await request(app)[ep.method](ep.url).send(ep.send || {});
      expect(res.status).toBe(401);
    }
  });

  it('403: blocks unauthorized requests when user lacks update or delete permissions', async () => {
    await setupTenantAndLogin();
    const deptRes = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ code: 'PERM', name: 'Permission Dept' });
    const deptId = deptRes.body.data._id;

    const { token } = await createRestrictedUser([PERMISSIONS.DEPARTMENT.READ]);

    const putRes = await request(app).put(`/api/v1/departments/${deptId}`).set('Authorization', `Bearer ${token}`).send({ name: 'Hack' });
    expect(putRes.status).toBe(403);

    const moveRes = await request(app).post(`/api/v1/departments/${deptId}/move`).set('Authorization', `Bearer ${token}`).send({ parentDepartmentId: null });
    expect(moveRes.status).toBe(403);

    const delRes = await request(app).delete(`/api/v1/departments/${deptId}`).set('Authorization', `Bearer ${token}`).send({ reason: 'Hack' });
    expect(delRes.status).toBe(403);
  });

  it('409: enforces duplicate code validation via HTTP', async () => {
    await setupTenantAndLogin();
    await request(app).post('/api/v1/departments').set('Authorization', `Bearer ${superAdminToken}`).send({ code: 'DUP_API', name: 'First' });
    const res = await request(app).post('/api/v1/departments').set('Authorization', `Bearer ${superAdminToken}`).send({ code: 'DUP_API', name: 'Second' });
    expect(res.status).toBe(409);
  });

  it('400: returns Bad Request when ObjectId is invalid', async () => {
    await setupTenantAndLogin();
    const res = await request(app).get('/api/v1/departments/invalid-id-format').set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(400);
  });

  it('400 or 404: rejects department creation when parent ObjectId does not exist', async () => {
    await setupTenantAndLogin();
    const res = await request(app).post('/api/v1/departments').set('Authorization', `Bearer ${superAdminToken}`).send({
      code: 'ORPHAN',
      name: 'Orphan Dept',
      parentDepartmentId: '6a4655b5e41f93f4262ca9ba'
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('409: rejects archiving a parent department that has active child departments', async () => {
    await setupTenantAndLogin();
    const parentRes = await request(app).post('/api/v1/departments').set('Authorization', `Bearer ${superAdminToken}`).send({ code: 'P_DEL', name: 'Parent Del' });
    const parentId = parentRes.body.data._id;
    await request(app).post('/api/v1/departments').set('Authorization', `Bearer ${superAdminToken}`).send({ code: 'C_DEL', name: 'Child Del', parentDepartmentId: parentId });

    const delRes = await request(app).delete(`/api/v1/departments/${parentId}`).set('Authorization', `Bearer ${superAdminToken}`).send({ reason: 'Del' });
    expect(delRes.status).toBe(409);
  });

  it('409: rejects circular move via HTTP endpoint', async () => {
    await setupTenantAndLogin();
    const parentRes = await request(app).post('/api/v1/departments').set('Authorization', `Bearer ${superAdminToken}`).send({ code: 'P_CIRC', name: 'Parent Circ' });
    const parentId = parentRes.body.data._id;
    const childRes = await request(app).post('/api/v1/departments').set('Authorization', `Bearer ${superAdminToken}`).send({ code: 'C_CIRC', name: 'Child Circ', parentDepartmentId: parentId });
    const childId = childRes.body.data._id;

    const moveRes = await request(app).post(`/api/v1/departments/${parentId}/move`).set('Authorization', `Bearer ${superAdminToken}`).send({ parentDepartmentId: childId });
    expect(moveRes.status).toBe(409);
  });

  it('409: rejects duplicate department name under the same parent', async () => {
    await setupTenantAndLogin();
    await request(app).post('/api/v1/departments').set('Authorization', `Bearer ${superAdminToken}`).send({ code: 'N1', name: 'Same Name' });
    const res = await request(app).post('/api/v1/departments').set('Authorization', `Bearer ${superAdminToken}`).send({ code: 'N2', name: 'Same Name' });
    expect(res.status).toBe(409);
  });

  it('Tenant Isolation: Tenant A cannot read, update, move, or archive departments in Tenant B', async () => {
    await setupTenantAndLogin();
    const tokenA = superAdminToken;

    const orgBPayload = {
      name: 'Tenant B Corp',
      code: 'ORGB',
      domain: 'orgb.io',
      adminEmail: 'admin@orgb.io',
      adminPassword: 'Super@Password123',
      adminFirstName: 'AdminB',
      adminLastName: 'UserB'
    };
    await OrganizationService.createOrganization(orgBPayload);
    const loginB = await request(app).post('/api/v1/auth/login').send({ email: orgBPayload.adminEmail, password: orgBPayload.adminPassword });
    const tokenB = loginB.body.data.accessToken;

    const deptBRes = await request(app).post('/api/v1/departments').set('Authorization', `Bearer ${tokenB}`).send({ code: 'SEC_B', name: 'Secret Dept B' });
    const idInB = deptBRes.body.data._id;

    // Verify Tenant A attempts fail with 404 Not Found
    const getRes = await request(app).get(`/api/v1/departments/${idInB}`).set('Authorization', `Bearer ${tokenA}`);
    expect(getRes.status).toBe(404);

    const putRes = await request(app).put(`/api/v1/departments/${idInB}`).set('Authorization', `Bearer ${tokenA}`).send({ name: 'Hacked B' });
    expect(putRes.status).toBe(404);

    const moveRes = await request(app).post(`/api/v1/departments/${idInB}/move`).set('Authorization', `Bearer ${tokenA}`).send({ parentDepartmentId: null });
    expect(moveRes.status).toBe(404);

    const delRes = await request(app).delete(`/api/v1/departments/${idInB}`).set('Authorization', `Bearer ${tokenA}`).send({ reason: 'Hacked B' });
    expect(delRes.status).toBe(404);
  });

  it('200: verifies select-options and single department GET endpoints format', async () => {
    await setupTenantAndLogin();
    const createRes = await request(app).post('/api/v1/departments').set('Authorization', `Bearer ${superAdminToken}`).send({ code: 'SEL_TEST', name: 'Select Test Dept' });
    const deptId = createRes.body.data._id;

    const selectRes = await request(app).get('/api/v1/departments/select-options').set('Authorization', `Bearer ${superAdminToken}`);
    expect(selectRes.status).toBe(200);
    expect(Array.isArray(selectRes.body.data)).toBe(true);
    const option = selectRes.body.data.find(o => o.code === 'SEL_TEST');
    expect(option).toBeDefined();
    expect(option).toHaveProperty('value');
    expect(option).toHaveProperty('label', 'Select Test Dept');
    expect(option).toHaveProperty('level', 0);

    const getRes = await request(app).get(`/api/v1/departments/${deptId}`).set('Authorization', `Bearer ${superAdminToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.code).toBe('SEL_TEST');
  });
});
