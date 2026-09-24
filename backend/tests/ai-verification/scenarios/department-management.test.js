import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import app from '#@/app.js';
import { startDb, clearDb, stopDb } from '../../setup/db.js';

describe('AI Orchestration Scenario - Department Management', () => {
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

  it('Orchestration: "Create an Engineering department under Technology"', async () => {
    // 1. AI provisions tenant (simulated setup)
    const orgRes = await request(app).post('/api/v1/organizations').send({
      name: 'NexusOps AI Test', code: 'NEXUSAI', domain: 'nexusops.ai',
      adminEmail: 'ai-admin@nexusops.ai', adminPassword: 'Secure@Password123', adminFirstName: 'AI', adminLastName: 'Admin'
    });
    const loginRes = await request(app).post('/api/v1/auth/login').send({ email: 'ai-admin@nexusops.ai', password: 'Secure@Password123' });
    token = loginRes.body.data.accessToken;

    // 2. AI decides to create "Technology" Root
    const techRes = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Technology', code: 'TECH' });
    expect(techRes.status).toBe(201);
    
    // 3. AI creates "Engineering" under "Technology"
    const engRes = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Engineering', code: 'ENG', parentDepartmentId: techRes.body.data._id });
    expect(engRes.status).toBe(201);
    expect(engRes.body.data.parentDepartmentId).toBe(techRes.body.data._id);

    // 4. AI fetches tree to confirm
    const treeRes = await request(app).get('/api/v1/departments/tree').set('Authorization', `Bearer ${token}`);
    expect(treeRes.status).toBe(200);
    expect(treeRes.body.data.length).toBeGreaterThan(0); // Should have the hierarchy built
  });
});
