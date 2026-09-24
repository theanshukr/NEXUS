import { describe, it, expect, vi, beforeEach } from 'vitest';
import EventBus from '#@/core/events/EventBus.js';
import EVENTS from '#@/core/constants/events/index.js';
import TenantContext from '#@/core/context/TenantContext.js';
import OrganizationBootstrapRegistry from '#@/core/bootstrap/OrganizationBootstrapRegistry.js';
import BaseRepository from '#@/core/repositories/BaseRepository.js';
import { TenantIsolationError } from '#@/core/errors/AppError.js';
import mongoose from 'mongoose';

describe('Phase A: Core Infrastructure Evolution – Independent Principal Architect Audit', () => {
  describe('1. EventBus Async Safety & Attachment Coverage', () => {
    it('should prevent unhandled rejections across on, once, prependListener, and addListener', async () => {
      const failingOn = vi.fn().mockRejectedValue(new Error('On failure'));
      const failingOnce = vi.fn().mockRejectedValue(new Error('Once failure'));
      const failingPrepend = vi.fn().mockRejectedValue(new Error('Prepend failure'));
      const failingAdd = vi.fn().mockRejectedValue(new Error('Add failure'));

      EventBus.on(EVENTS.USER.REGISTERED, failingOn);
      EventBus.once(EVENTS.USER.REGISTERED, failingOnce);
      EventBus.prependListener(EVENTS.USER.REGISTERED, failingPrepend);
      EventBus.addListener(EVENTS.USER.REGISTERED, failingAdd);

      expect(() => {
        EventBus.emit(EVENTS.USER.REGISTERED, { userId: '123' });
      }).not.toThrow();

      await new Promise(resolve => setTimeout(resolve, 30));

      expect(failingOn).toHaveBeenCalled();
      expect(failingOnce).toHaveBeenCalled();
      expect(failingPrepend).toHaveBeenCalled();
      expect(failingAdd).toHaveBeenCalled();

      EventBus.removeListener(EVENTS.USER.REGISTERED, failingOn);
      EventBus.off(EVENTS.USER.REGISTERED, failingPrepend);
      EventBus.off(EVENTS.USER.REGISTERED, failingAdd);
    });
  });

  describe('2. TenantContext AsyncLocalStorage Safety Net', () => {
    it('should isolate tenant context within run blocks without leaking across async boundaries', async () => {
      expect(TenantContext.getOrganizationId()).toBeNull();

      const runA = new Promise((resolve) => {
        TenantContext.run({ organizationId: 'org-alpha' }, async () => {
          await new Promise(r => setTimeout(r, 10));
          expect(TenantContext.getOrganizationId()).toBe('org-alpha');
          resolve();
        });
      });

      const runB = new Promise((resolve) => {
        TenantContext.run({ organizationId: 'org-beta' }, async () => {
          await new Promise(r => setTimeout(r, 5));
          expect(TenantContext.getOrganizationId()).toBe('org-beta');
          resolve();
        });
      });

      await Promise.all([runA, runB]);
      expect(TenantContext.getOrganizationId()).toBeNull();
    });
  });

  describe('3 & 6. BaseRepository ALS Safety Net & Validation Enforcement', () => {
    const mockModel = { modelName: 'MockModel' };
    const repo = new BaseRepository(mockModel);

    it('should throw TenantIsolationError if explicitly passed organizationId mismatches ALS context', () => {
      TenantContext.run({ organizationId: 'org-legit' }, () => {
        expect(() => {
          repo._scopeFilter({}, 'org-malicious-leak');
        }).toThrow(TenantIsolationError);
      });
    });

    it('should pass validation when explicit organizationId matches ALS context or when ALS is absent', () => {
      expect(() => {
        repo._scopeFilter({}, 'org-background-job');
      }).not.toThrow();

      TenantContext.run({ organizationId: 'org-matching' }, () => {
        expect(() => {
          repo._scopeFilter({}, 'org-matching');
        }).not.toThrow();
      });
    });
  });

  describe('4 & 5. OrganizationBootstrapRegistry Determinism & Idempotency', () => {
    beforeEach(() => {
      OrganizationBootstrapRegistry.clear();
    });

    it('should sort handlers deterministically by priority and alphabetically when priorities tie', () => {
      const handlerA = vi.fn();
      const handlerB = vi.fn();
      const handlerC = vi.fn();

      OrganizationBootstrapRegistry.register('ZebraHandler', handlerC, 10);
      OrganizationBootstrapRegistry.register('AlphaHandler', handlerA, 10);
      OrganizationBootstrapRegistry.register('EarlyHandler', handlerB, 5);

      expect(OrganizationBootstrapRegistry.handlers[0].name).toBe('EarlyHandler');
      expect(OrganizationBootstrapRegistry.handlers[1].name).toBe('AlphaHandler');
      expect(OrganizationBootstrapRegistry.handlers[2].name).toBe('ZebraHandler');
    });

    it('should support idempotent execution where re-running handlers does not duplicate data', async () => {
      const seededData = new Set();
      const idempotentHandler = vi.fn().mockImplementation(async (payload) => {
        const key = `dept-${payload.organizationId}-General`;
        if (!seededData.has(key)) {
          seededData.add(key);
        }
      });

      OrganizationBootstrapRegistry.register('IdempotentSeed', idempotentHandler, 10);

      // Execute first time
      await OrganizationBootstrapRegistry.executeAll({ organizationId: 'org-123', adminUserId: 'admin-123' }, { session: {} });
      expect(seededData.size).toBe(1);

      // Execute second time (simulating re-run or retry)
      await OrganizationBootstrapRegistry.executeAll({ organizationId: 'org-123', adminUserId: 'admin-123' }, { session: {} });
      expect(seededData.size).toBe(1);
      expect(idempotentHandler).toHaveBeenCalledTimes(2);
    });

    it('should isolate failures so that if one handler throws, subsequent handlers still execute', async () => {
      OrganizationBootstrapRegistry.clear();
      const executionLog = [];

      const handlerA = vi.fn().mockImplementation(async () => { executionLog.push('A'); });
      const handlerB = vi.fn().mockImplementation(async () => { executionLog.push('B'); throw new Error('Simulated Handler B failure'); });
      const handlerC = vi.fn().mockImplementation(async () => { executionLog.push('C'); });

      OrganizationBootstrapRegistry.register('HandlerA', handlerA, 1);
      OrganizationBootstrapRegistry.register('HandlerB', handlerB, 2);
      OrganizationBootstrapRegistry.register('HandlerC', handlerC, 3);

      await OrganizationBootstrapRegistry.executeAll({ organizationId: 'org-fail-test', adminUserId: 'admin-fail-test' }, { session: {} });

      expect(executionLog).toEqual(['A', 'B', 'C']);
      expect(handlerA).toHaveBeenCalled();
      expect(handlerB).toHaveBeenCalled();
      expect(handlerC).toHaveBeenCalled();
    });

    it('should wrap sequential handlers in independent transactions when no session is passed', async () => {
      OrganizationBootstrapRegistry.clear();
      const mockSession = {
        withTransaction: vi.fn(async (fn) => await fn()),
        endSession: vi.fn().mockResolvedValue()
      };
      const spyStartSession = vi.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession);

      const handlerA = vi.fn().mockResolvedValue();
      const handlerB = vi.fn().mockResolvedValue();

      OrganizationBootstrapRegistry.register('TxHandlerA', handlerA, 10);
      OrganizationBootstrapRegistry.register('TxHandlerB', handlerB, 20);

      // Execute without passing options.session
      await OrganizationBootstrapRegistry.executeAll({ organizationId: 'org-tx-test', adminUserId: 'admin-tx-test' });

      expect(handlerA).toHaveBeenCalledTimes(1);
      expect(handlerB).toHaveBeenCalledTimes(1);
      // Both handlers should have been passed an object containing a Mongoose session created by runInTransaction
      expect(handlerA.mock.calls[0][1]).toHaveProperty('session', mockSession);
      expect(handlerB.mock.calls[0][1]).toHaveProperty('session', mockSession);

      spyStartSession.mockRestore();
    });
  });
});
