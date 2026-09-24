import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { startDb, clearDb, stopDb } from '../setup/db.js';
import AuditLog from '#@/modules/audit/models/AuditLog.js';
import AuditRepository from '#@/modules/audit/repositories/AuditRepository.js';

/**
 * Phase 2 – AuditRepository & AuditLog Immutability Integration Tests
 *
 * Verifies:
 * - AuditLog records can be created via AuditRepository
 * - findLogsByTenant returns results in descending timestamp order
 * - Mongoose pre-hooks block findOneAndUpdate on AuditLog
 * - Mongoose pre-hooks block updateOne on AuditLog
 * - Mongoose pre-hooks block deleteOne on AuditLog
 * - findOneAndDelete is NOT blocked (different hook — not registered)
 *   Note: only the three hooks above are guarded per AuditLog.js
 */
describe('AuditRepository & AuditLog Immutability – Integration Tests', () => {
  const ORG = new mongoose.Types.ObjectId();
  const ACTOR = new mongoose.Types.ObjectId();
  const ENTITY = new mongoose.Types.ObjectId();

  beforeAll(async () => { await startDb(); });
  afterEach(async () => { await clearDb(); });
  afterAll(async () => { await stopDb(); });

  function makeLogData(action = 'ROLE_CREATED', overrides = {}) {
    return {
      actorId: ACTOR,
      action,
      entityType: 'Role',
      entityId: ENTITY,
      previousValue: null,
      newValue: { name: 'Test Role' },
      timestamp: new Date(),
      ...overrides
    };
  }

  // ─── createScoped ───────────────────────────────────────────────────────

  it('createScoped writes an audit log with correct fields', async () => {
    const log = await AuditRepository.createScoped(makeLogData(), ORG);

    expect(log._id).toBeDefined();
    expect(log.organizationId.toString()).toBe(ORG.toString());
    expect(log.action).toBe('ROLE_CREATED');
    expect(log.actorId.toString()).toBe(ACTOR.toString());
    expect(log.newValue).toEqual({ name: 'Test Role' });
  });

  // ─── findLogsByTenant ───────────────────────────────────────────────────

  it('findLogsByTenant returns logs sorted descending by timestamp', async () => {
    const t1 = new Date('2026-01-01T10:00:00Z');
    const t2 = new Date('2026-01-01T11:00:00Z');
    const t3 = new Date('2026-01-01T12:00:00Z');

    await AuditRepository.createScoped(makeLogData('FIRST', { timestamp: t1 }), ORG);
    await AuditRepository.createScoped(makeLogData('SECOND', { timestamp: t2 }), ORG);
    await AuditRepository.createScoped(makeLogData('THIRD', { timestamp: t3 }), ORG);

    const logs = await AuditRepository.findLogsByTenant(ORG, {}, { limit: 10 });

    expect(logs[0].action).toBe('THIRD');
    expect(logs[1].action).toBe('SECOND');
    expect(logs[2].action).toBe('FIRST');
  });

  it('findLogsByTenant is tenant-scoped — Org A logs invisible to Org B', async () => {
    const ORG_B = new mongoose.Types.ObjectId();
    await AuditRepository.createScoped(makeLogData('ORG_A_ACTION'), ORG);

    const orgBLogs = await AuditRepository.findLogsByTenant(ORG_B);
    expect(orgBLogs).toHaveLength(0);
  });

  it('findLogsByTenant respects limit option', async () => {
    for (let i = 0; i < 5; i++) {
      await AuditRepository.createScoped(makeLogData(`ACTION_${i}`), ORG);
    }
    const logs = await AuditRepository.findLogsByTenant(ORG, {}, { limit: 3 });
    expect(logs).toHaveLength(3);
  });

  // ─── Immutability: findOneAndUpdate blocked ─────────────────────────────

  it('IMMUTABILITY: findOneAndUpdate on AuditLog throws security violation', async () => {
    const log = await AuditRepository.createScoped(makeLogData(), ORG);

    await expect(
      AuditLog.findOneAndUpdate({ _id: log._id }, { action: 'TAMPERED' })
    ).rejects.toThrow('Security Violation: AuditLog ledger records are strictly immutable.');
  });

  // ─── Immutability: updateOne blocked ───────────────────────────────────

  it('IMMUTABILITY: updateOne on AuditLog throws security violation', async () => {
    const log = await AuditRepository.createScoped(makeLogData(), ORG);

    await expect(
      AuditLog.updateOne({ _id: log._id }, { $set: { action: 'TAMPERED' } })
    ).rejects.toThrow('Security Violation: AuditLog ledger records are strictly immutable.');
  });

  // ─── Immutability: deleteOne blocked ───────────────────────────────────

  it('IMMUTABILITY: deleteOne on AuditLog throws security violation', async () => {
    const log = await AuditRepository.createScoped(makeLogData(), ORG);

    await expect(
      AuditLog.deleteOne({ _id: log._id })
    ).rejects.toThrow('Security Violation: AuditLog ledger records are strictly immutable.');
  });

  // ─── Original record survives after tamper attempts ────────────────────

  it('after blocked update attempt, original record remains intact', async () => {
    const log = await AuditRepository.createScoped(makeLogData('ORIGINAL'), ORG);

    try { await AuditLog.updateOne({ _id: log._id }, { action: 'TAMPERED' }); } catch {}

    const logs = await AuditRepository.findLogsByTenant(ORG);
    expect(logs[0].action).toBe('ORIGINAL');
  });

  // ─── Multiple log actions in sequence ──────────────────────────────────

  it('multiple different action types can be written and retrieved correctly', async () => {
    await AuditRepository.createScoped(makeLogData('TENANT_PROVISIONED'), ORG);
    await AuditRepository.createScoped(makeLogData('ROLE_ASSIGNED'), ORG);
    await AuditRepository.createScoped(makeLogData('ROLE_REMOVED'), ORG);

    const logs = await AuditRepository.findLogsByTenant(ORG, {}, { limit: 10 });
    const actions = logs.map(l => l.action);
    expect(actions).toContain('TENANT_PROVISIONED');
    expect(actions).toContain('ROLE_ASSIGNED');
    expect(actions).toContain('ROLE_REMOVED');
  });
});
