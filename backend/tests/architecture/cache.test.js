import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { InMemoryRedisMock } from '#@/platform/cache/redis/index.js';
import cacheService from '#@/platform/cache/index.js';

/**
 * Phase 1 – Cache / Redis Architecture Tests
 * 
 * Verifies:
 * - InMemoryRedisMock implements the full CacheService interface
 * - TTL expiration works correctly in-memory
 * - CacheService wraps the mock and exposes all required methods
 * - Upstash client initializes (or falls back) without throwing
 */
describe('Architecture – CacheService & Redis Initialization', () => {
  let mock;

  beforeAll(() => {
    mock = new InMemoryRedisMock();
  });

  afterAll(async () => {
    // Clean up any test keys written to the live Upstash instance
    await cacheService.delete('arch:test:key', 'arch:test:counter');
  });

  // ─── InMemoryRedisMock Unit Tests ─────────────────────────────────────────

  describe('InMemoryRedisMock', () => {
    it('should return null for a missing key', async () => {
      const result = await mock.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should set and get a string value', async () => {
      await mock.set('k1', 'hello');
      expect(await mock.get('k1')).toBe('hello');
    });

    it('should set with TTL and expire the key', async () => {
      await mock.set('ttl-key', 'temp', { ex: 1 }); // 1 second
      expect(await mock.get('ttl-key')).toBe('temp');

      // Manually fast-forward expiry map
      mock.expirations.set('ttl-key', Date.now() - 1);
      expect(await mock.get('ttl-key')).toBeNull();
    });

    it('should delete a key and return count', async () => {
      await mock.set('del-key', 'x');
      const count = await mock.del('del-key');
      expect(count).toBe(1);
      expect(await mock.get('del-key')).toBeNull();
    });

    it('should return 1 for existing key, 0 for missing', async () => {
      await mock.set('exist-key', 'v');
      expect(await mock.exists('exist-key')).toBe(1);
      expect(await mock.exists('ghost')).toBe(0);
    });

    it('should atomically increment a counter', async () => {
      expect(await mock.incr('counter')).toBe(1);
      expect(await mock.incr('counter')).toBe(2);
      expect(await mock.incr('counter')).toBe(3);
    });

    it('should apply expire on existing key', async () => {
      await mock.set('exp-key', 'val');
      const result = await mock.expire('exp-key', 1);
      expect(result).toBe(1);

      mock.expirations.set('exp-key', Date.now() - 1);
      expect(await mock.get('exp-key')).toBeNull();
    });

    it('should return 0 for expire on nonexistent key', async () => {
      const result = await mock.expire('no-key', 100);
      expect(result).toBe(0);
    });

    it('should match keys by glob pattern', async () => {
      await mock.set('tenant:123:session:abc', 'a');
      await mock.set('tenant:123:session:def', 'b');
      await mock.set('tenant:456:other', 'c');

      const keys = await mock.keys('tenant:123:session:*');
      expect(keys).toHaveLength(2);
      expect(keys).toContain('tenant:123:session:abc');
      expect(keys).toContain('tenant:123:session:def');
    });

    it('should serialize non-string values with setex', async () => {
      await mock.setex('obj-key', 60, JSON.stringify({ x: 1 }));
      const val = await mock.get('obj-key');
      expect(JSON.parse(val)).toEqual({ x: 1 });
    });
  });

  // ─── CacheService (wrapping live Upstash or mock) ────────────────────────

  describe('CacheService abstraction layer', () => {
    it('should expose get, set, delete, exists, increment, expire, keys methods', () => {
      expect(typeof cacheService.get).toBe('function');
      expect(typeof cacheService.set).toBe('function');
      expect(typeof cacheService.delete).toBe('function');
      expect(typeof cacheService.del).toBe('function');
      expect(typeof cacheService.exists).toBe('function');
      expect(typeof cacheService.increment).toBe('function');
      expect(typeof cacheService.expire).toBe('function');
      expect(typeof cacheService.keys).toBe('function');
    });

    it('should set and get a value via CacheService', async () => {
      await cacheService.set('arch:test:key', 'nexusops', 120);
      const val = await cacheService.get('arch:test:key');
      expect(val).toBe('nexusops');
    });

    it('should check existence via CacheService', async () => {
      await cacheService.set('arch:test:key', 'exists', 60);
      const result = await cacheService.exists('arch:test:key');
      expect(result).toBe(1);
    });

    it('should increment a counter via CacheService', async () => {
      const c1 = await cacheService.increment('arch:test:counter');
      const c2 = await cacheService.increment('arch:test:counter');
      expect(c2).toBe(c1 + 1);
    });

    it('should delete a key via CacheService', async () => {
      await cacheService.set('arch:del:me', 'bye', 60);
      await cacheService.delete('arch:del:me');
      const val = await cacheService.get('arch:del:me');
      expect(val).toBeNull();
    });
  });
});
