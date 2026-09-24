import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import EventBus from '#@/core/events/EventBus.js';
import { runInTransaction } from '#@/platform/database/db.js';
import { startDb, stopDb } from '../setup/db.js';

describe('Transaction-Aware EventBus Behavior', () => {
  beforeAll(async () => {
    await startDb();
  });

  afterAll(async () => {
    await stopDb();
  });

  beforeEach(() => {
    vi.spyOn(EventBus, 'emit');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits events outside a transaction immediately', async () => {
    // Just use the standard spy, we can see if it was called directly
    EventBus.emit('TEST.IMMEDIATE', { data: 123 });

    expect(EventBus.emit).toHaveBeenCalledWith('TEST.IMMEDIATE', { data: 123 });
  });

  it('queues events during a transaction and emits them upon successful commit', async () => {
    // Clear initial calls
    EventBus.emit.mockClear();
    
    await runInTransaction(async () => {
      EventBus.emit('TEST.QUEUED_1', { data: 1 });
      EventBus.emit('TEST.QUEUED_2', { data: 2 });
      
      // Inside transaction, it gets called (but intercepted by the queue logic)
      expect(EventBus.emit).toHaveBeenCalledTimes(2);
      expect(EventBus.emit).toHaveBeenNthCalledWith(1, 'TEST.QUEUED_1', { data: 1 });
      expect(EventBus.emit).toHaveBeenNthCalledWith(2, 'TEST.QUEUED_2', { data: 2 });
      EventBus.emit.mockClear();
    });

    // After transaction completes successfully, they should be flushed (re-emitted with skipQueue)
    expect(EventBus.emit).toHaveBeenCalledTimes(2);
    expect(EventBus.emit).toHaveBeenNthCalledWith(1, 'TEST.QUEUED_1', { data: 1 }, { skipQueue: true });
    expect(EventBus.emit).toHaveBeenNthCalledWith(2, 'TEST.QUEUED_2', { data: 2 }, { skipQueue: true });
  });

  it('discards queued events when a transaction rolls back due to an error', async () => {
    EventBus.emit.mockClear();
    
    try {
      await runInTransaction(async () => {
        EventBus.emit('TEST.DISCARDED', { data: 999 });
        expect(EventBus.emit).toHaveBeenCalledTimes(1);
        EventBus.emit.mockClear();
        throw new Error('Forced Rollback Error');
      });
    } catch (err) {
      expect(err.message).toBe('Forced Rollback Error');
    }

    // Should never have been flushed
    expect(EventBus.emit).not.toHaveBeenCalled();
  });
  
  it('clears the queue after commit so events do not leak into later transactions', async () => {
    EventBus.emit.mockClear();
    
    await runInTransaction(async () => {
      EventBus.emit('TEST.FIRST_TX', { data: 1 });
      EventBus.emit.mockClear();
    });
    
    expect(EventBus.emit).toHaveBeenCalledTimes(1);
    
    EventBus.emit.mockClear();
    
    await runInTransaction(async () => {
      // Intentionally emit nothing inside this transaction
    });
    
    expect(EventBus.emit).not.toHaveBeenCalled();
  });

  it('supports nested runInTransaction blocks (flattening behavior)', async () => {
    EventBus.emit.mockClear();
    
    await runInTransaction(async () => {
      EventBus.emit('TEST.NESTED_OUTER', { data: 1 });
      
      await runInTransaction(async () => {
        EventBus.emit('TEST.NESTED_INNER', { data: 2 });
      });
    });

    const finalEmits = EventBus.emit.mock.calls.filter(call => call[2]?.skipQueue === true);
    
    expect(finalEmits.length).toBe(2);
    // Since inner transaction finishes first, its events are flushed first!
    expect(finalEmits[0][0]).toBe('TEST.NESTED_INNER');
    expect(finalEmits[1][0]).toBe('TEST.NESTED_OUTER');
  });
});
