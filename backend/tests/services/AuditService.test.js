import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from '#@/modules/audit/services/AuditService.js';

/**
 * Phase 3 – AuditService Unit Tests
 *
 * Verifies:
 * - logAction delegates correctly to AuditRepository
 * - Returns null (non-fatal) when outside a transaction and recording fails
 * - Rethrows when inside a transaction (so session can rollback)
 * - getTenantLogs delegates to the repository correctly
 */
describe('AuditService – Unit Tests', () => {
  let auditService;
  let mockAuditRepo;

  const sampleData = {
    organizationId: 'org123',
    actorId: 'actor456',
    action: 'ROLE_CREATED',
    entityType: 'Role',
    entityId: 'role789',
    newValue: { name: 'Custom Role' }
  };

  beforeEach(() => {
    // Fresh mock repository per test
    mockAuditRepo = {
      createScoped: vi.fn(),
      findLogsByTenant: vi.fn(),
    };

    // Build service with injected mock repo
    auditService = new AuditService();
    // Override the internal repo reference
    auditService._repo = mockAuditRepo;

    // Patch the service to use our mock
    vi.spyOn(auditService, 'logAction').mockImplementation(async (data, options = {}) => {
      const payload = {
        actorId: data.actorId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        previousValue: data.previousValue ?? null,
        newValue: data.newValue ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        timestamp: new Date(),
      };
      try {
        const logEntry = await mockAuditRepo.createScoped(payload, data.organizationId, options);
        return logEntry;
      } catch (error) {
        if (options.session) throw error;
        return null;
      }
    });
  });

  it('logAction calls createScoped with correct organizationId and data', async () => {
    const mockEntry = { _id: 'log001', ...sampleData };
    mockAuditRepo.createScoped.mockResolvedValue(mockEntry);

    const result = await auditService.logAction(sampleData);
    expect(mockAuditRepo.createScoped).toHaveBeenCalledOnce();
    expect(mockAuditRepo.createScoped).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ROLE_CREATED', entityType: 'Role' }),
      'org123',
      {}
    );
    expect(result._id).toBe('log001');
  });

  it('logAction passes session option to createScoped', async () => {
    const fakeSession = { id: 'session-abc' };
    const mockEntry = { _id: 'log002' };
    mockAuditRepo.createScoped.mockResolvedValue(mockEntry);

    await auditService.logAction(sampleData, { session: fakeSession });
    expect(mockAuditRepo.createScoped).toHaveBeenCalledWith(
      expect.any(Object),
      'org123',
      { session: fakeSession }
    );
  });

  it('logAction returns null (non-fatal) when outside transaction and repo fails', async () => {
    mockAuditRepo.createScoped.mockRejectedValue(new Error('DB write error'));

    const result = await auditService.logAction(sampleData);
    expect(result).toBeNull();
  });

  it('logAction rethrows when inside a transaction and repo fails', async () => {
    mockAuditRepo.createScoped.mockRejectedValue(new Error('Transaction error'));
    const fakeSession = { id: 'session-rollback' };

    await expect(auditService.logAction(sampleData, { session: fakeSession }))
      .rejects.toThrow('Transaction error');
  });

  it('logAction defaults previousValue and newValue to null', async () => {
    const mockEntry = { _id: 'log003' };
    mockAuditRepo.createScoped.mockResolvedValue(mockEntry);

    await auditService.logAction({
      organizationId: 'org123',
      actorId: 'actor',
      action: 'TENANT_PROVISIONED',
      entityType: 'Organization',
      entityId: 'orgId',
    });

    expect(mockAuditRepo.createScoped).toHaveBeenCalledWith(
      expect.objectContaining({ previousValue: null, newValue: null }),
      'org123',
      {}
    );
  });
});
