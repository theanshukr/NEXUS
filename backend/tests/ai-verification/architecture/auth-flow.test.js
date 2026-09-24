import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '#@/app.js';
import { startDb, clearDb, stopDb } from '../../setup/db.js';

describe('AI Architecture Verification - Authentication Flow', () => {

  beforeAll(async () => {
    await startDb();
  });

  afterEach(async () => {
    await clearDb();
  });

  afterAll(async () => {
    await stopDb();
  });

  it('1. MUST allow public registration of a new organization without authentication', async () => {
    const res = await request(app)
      .post('/api/v1/organizations')
      .send({
        name: 'NexusOps AI Test',
        code: 'NEXUSAI',
        domain: 'nexusops.ai',
        adminEmail: 'ai-admin@nexusops.ai',
        adminPassword: 'Secure@Password123',
        adminFirstName: 'AI',
        adminLastName: 'Admin'
      });
      
    expect(res.status).toBe(201);
    expect(res.body.data.organization).toBeDefined();
  });

  it('2. MUST authenticate successfully and issue session tokens', async () => {
    await request(app)
      .post('/api/v1/organizations')
      .send({
        name: 'NexusOps AI Test',
        code: 'NEXUSAI',
        domain: 'nexusops.ai',
        adminEmail: 'ai-admin@nexusops.ai',
        adminPassword: 'Secure@Password123',
        adminFirstName: 'AI',
        adminLastName: 'Admin'
      });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'ai-admin@nexusops.ai',
        password: 'Secure@Password123'
      });
      
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeDefined();
  });
});
