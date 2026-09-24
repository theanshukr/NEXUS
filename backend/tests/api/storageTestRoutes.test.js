import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '#@/app.js';
import fs from 'fs/promises';
import path from 'path';
import { STORAGE_CONFIG } from '#@/platform/storage/config.js';
import { storageService } from '#@/platform/storage/index.js';

describe('Storage Test Routes API Integration', () => {
  const localBasePath = path.resolve(process.cwd(), STORAGE_CONFIG.LOCAL.PATH);

  beforeAll(async () => {
    try {
      await fs.mkdir(localBasePath, { recursive: true });
    } catch (e) {}
  });

  afterAll(async () => {
    try {
      await fs.rm(localBasePath, { recursive: true, force: true });
    } catch (e) {}
  });

  it('GET /api/v1/storage/test/health should perform healthcheck', async () => {
    const res = await request(app).get('/api/v1/storage/test/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  let uploadedPath = '';
  let signedUrlToTest = '';

  it('POST /api/v1/storage/test/upload should upload a valid file', async () => {
    const res = await request(app)
      .post('/api/v1/storage/test/upload')
      .attach('file', Buffer.from('dummy file content'), 'test.pdf');
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.provider).toBe(storageService.providerName);
    expect(res.body.path).toContain('development/');
    expect(res.body.uploadedAt).toBeDefined();
    
    uploadedPath = res.body.path;
  });

  it('GET /api/v1/storage/test/download should download the file', async () => {
    const res = await request(app)
      .get(`/api/v1/storage/test/download?path=${uploadedPath}`);
      
    expect(res.status).toBe(200);
    expect(res.body.toString()).toBe('dummy file content');
  });

  it('GET /api/v1/storage/test/signed-url should return a signed URL (or 501 for local)', async () => {
    const res = await request(app)
      .get(`/api/v1/storage/test/signed-url?path=${uploadedPath}`);
      
    if (storageService.providerName === 'local') {
      expect(res.status).toBe(501);
    } else {
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.signedUrl).toBeDefined();
      expect(res.body.expiresIn).toBe(60);
      signedUrlToTest = res.body.signedUrl;
    }
  });

  // Expiration test - only relevant if provider is supabase
  it('Signed URL should expire after 60 seconds', async () => {
    if (storageService.providerName !== 'supabase' || !signedUrlToTest) {
      return;
    }

    // Access URL immediately
    // Since signedUrlToTest is a full URL, we can use fetch
    const immediateRes = await fetch(signedUrlToTest);
    expect(immediateRes.status).toBe(200);

    // Wait 65 seconds
    console.log('Waiting 65 seconds to verify signed URL expiration...');
    await new Promise(resolve => setTimeout(resolve, 65000));

    // Access URL again
    const expiredRes = await fetch(signedUrlToTest);
    // Supabase usually returns 400 or 403 when token is expired
    expect([400, 401, 403]).toContain(expiredRes.status);
  }, 80000); // 80 seconds timeout for this test

  it('DELETE /api/v1/storage/test/test-delete should delete the file', async () => {
    const res = await request(app)
      .delete(`/api/v1/storage/test/test-delete?path=${uploadedPath}`);
      
    expect(res.status).toBe(200);
  });
});
