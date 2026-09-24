import { describe, it, expect } from 'vitest';
import app from '#@/app.js';
import request from 'supertest';

/**
 * Phase 1 – Architecture & Startup Tests
 * 
 * These tests verify that the Express application is correctly assembled:
 * - All routes are mounted under /api/v1
 * - The health check endpoint responds correctly
 * - Unmatched routes return 404 with the correct JSON error shape
 * - Global error handler formats errors consistently
 * - Security headers (Helmet) are applied
 */
describe('Architecture – App Startup & Route Mounting', () => {
  it('should have a valid Express app instance', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function'); // Express app is a function
  });

  it('GET /api/v1/health → 200 with correct service info', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.service).toBe('Enterprise Workforce Management Platform API v1');
  });

  it('GET /nonexistent → 404 with structured error JSON', async () => {
    const res = await request(app).get('/nonexistent-route-xyz');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code');
  });

  it('GET /api/v1/nonexistent → 404 for unknown v1 route', async () => {
    const res = await request(app).get('/api/v1/unknown');
    expect(res.status).toBe(404);
  });

  it('should apply security headers via Helmet', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('GET /api/v1/auth/login without body → 400 validation error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('GET /api/v1/roles without auth → 401', async () => {
    const res = await request(app).get('/api/v1/roles');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/organizations/me without auth → 401', async () => {
    const res = await request(app).get('/api/v1/organizations/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/auth/me without auth → 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
