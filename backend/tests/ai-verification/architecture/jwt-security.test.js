import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '#@/app.js';
import { startDb, clearDb, stopDb } from '../../setup/db.js';
import OrganizationService from '#@/modules/organization/services/OrganizationService.js';
import jwt from 'jsonwebtoken';
import env from '#@/config/env.js';

describe('AI Architecture Verification - JWT Security', () => {
  let orgData;
  let adminUser;
  let token;

  beforeAll(async () => {
    await startDb();
  });

  afterEach(async () => {
    await clearDb();
  });

  afterAll(async () => {
    await stopDb();
  });

  async function setupTenant() {
    const res = await OrganizationService.createOrganization({
      name: 'NexusOps AI Test',
      code: 'NEXUSAI',
      domain: 'nexusops.ai',
      adminEmail: 'ai-admin@nexusops.ai',
      adminPassword: 'Secure@Password123',
      adminFirstName: 'AI',
      adminLastName: 'Admin'
    });
    orgData = res.organization;
    adminUser = res.adminUser;

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'ai-admin@nexusops.ai',
        password: 'Secure@Password123'
      });
    token = loginRes.body.data.accessToken;
  }

  it('1. MUST reject JWTs signed with incorrect secrets (401)', async () => {
    await setupTenant();
    
    // AI orchestrator hallucinates a token using a fake secret
    const forgedToken = jwt.sign({
      id: adminUser.id,
      organizationId: orgData.id,
      sessionId: 'fake-session'
    }, 'malicious-secret', { expiresIn: '1h' });

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${forgedToken}`);
      
    expect(res.status).toBe(401);
  });

  it('2. MUST reject expired JWTs (401)', async () => {
    await setupTenant();
    
    // Sign a token that expired 1 hour ago (using the real secret to test expiration check)
    const expiredToken = jwt.sign({
      id: adminUser.id,
      organizationId: orgData.id,
      sessionId: 'fake-session',
      exp: Math.floor(Date.now() / 1000) - 3600
    }, env.JWT_ACCESS_SECRET);

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);
      
    expect(res.status).toBe(401);
    expect(res.body.error.message).toContain('expired');
  });

  it('3. MUST strictly extract User ID from JWT payload, ignoring explicit body params', async () => {
    await setupTenant();
    
    // An AI orchestrator attempts to bypass authentication by providing a target user ID in the body
    // while using its own valid standard employee token.
    
    const roleRes = await request(app)
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Worker', priority: 50, permissions: ['user.read_self'] });
      
    const inviteRes = await request(app)
      .post('/api/v1/invites')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'worker@nexusops.ai',
        roleIds: [roleRes.body.data._id],
        expiresInHours: 24,
        maxUses: 1
      });
      
    const regRes = await request(app)
      .post('/api/v1/auth/register-invite')
      .send({
        token: inviteRes.body.data.token,
        email: 'worker@nexusops.ai',
        password: 'Password@123',
        firstName: 'Work',
        lastName: 'Er'
      });
      
    const workerToken = regRes.body.data.accessToken;

    // The AI tries to call an endpoint with the worker's token, but hallucinates it's the admin.
    const res = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        name: 'Hacked Dept',
        code: 'HACK',
        userId: adminUser.id // Spoofing attempt
      });
      
    // Because the backend extracts the actor ONLY from the JWT (workerToken),
    // it sees the actor only has 'user.read_self' and properly denies the action.
    expect(res.status).toBe(403);
  });
});
