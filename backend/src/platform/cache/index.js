import logger from '#@/platform/logger/index.js';
import redisClient, { InMemoryRedisMock } from './redis/index.js';

/**
 * CacheService Abstraction Layer.
 * Decouples business modules from the underlying caching implementation (Upstash Redis / In-Memory Mock).
 * 
 * Redis should be used strictly for:
 * - Permission caching
 * - Session caching
 * - AI session context
 * - Conversation summaries
 * - Rate limiting
 * - Refresh token cache
 * - Temporary data (OTPs, invitation validation)
 * 
 * NEVER store permanent business data in Redis.
 */
export class CacheService {
  constructor() {
    this.client = redisClient;
    this.fallbackMock = new InMemoryRedisMock();
  }

  /**
   * Retrieves a cached value by key.
   * @param {string} key 
   */
  async get(key) {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.warn({ key, err: error.message }, 'Cache get error; falling back to memory mock');
      return await this.fallbackMock.get(key);
    }
  }

  /**
   * Sets a key-value pair in the cache with an optional TTL (in seconds).
   * @param {string} key 
   * @param {any} value 
   * @param {number} [ttl] Optional expiration duration in seconds
   */
  async set(key, value, ttl) {
    try {
      if (ttl && typeof ttl === 'number') {
        return await this.client.set(key, value, { ex: ttl });
      }
      return await this.client.set(key, value);
    } catch (error) {
      logger.warn({ key, err: error.message }, 'Cache set error; falling back to memory mock');
      return await this.fallbackMock.set(key, value, ttl ? { ex: ttl } : {});
    }
  }

  /**
   * Alias for set with explicit TTL in seconds (for compatibility with setex patterns).
   */
  async setex(key, ttlSeconds, value) {
    return await this.set(key, value, ttlSeconds);
  }

  /**
   * Deletes one or more cached keys.
   * @param {...string|string[]} keys 
   */
  async delete(...keys) {
    const flatKeys = Array.isArray(keys[0]) ? keys[0] : keys;
    if (flatKeys.length === 0) return 0;
    try {
      return await this.client.del(...flatKeys);
    } catch (error) {
      logger.warn({ keys: flatKeys, err: error.message }, 'Cache delete error; falling back to memory mock');
      return await this.fallbackMock.del(...flatKeys);
    }
  }

  /**
   * Alias for delete.
   */
  async del(...keys) {
    return await this.delete(...keys);
  }

  /**
   * Checks if a key exists in the cache. Returns 1 if present, 0 otherwise.
   * @param {string} key 
   */
  async exists(key) {
    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.warn({ key, err: error.message }, 'Cache exists error; falling back to memory mock');
      return await this.fallbackMock.exists(key);
    }
  }

  /**
   * Atomically increments a numerical key.
   * @param {string} key 
   */
  async increment(key) {
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.warn({ key, err: error.message }, 'Cache increment error; falling back to memory mock');
      return await this.fallbackMock.incr(key);
    }
  }

  /**
   * Sets a TTL timestamp on an existing key.
   * @param {string} key 
   * @param {number} ttl Duration in seconds
   */
  async expire(key, ttl) {
    try {
      return await this.client.expire(key, ttl);
    } catch (error) {
      logger.warn({ key, err: error.message }, 'Cache expire error; falling back to memory mock');
      return await this.fallbackMock.expire(key, ttl);
    }
  }

  /**
   * Finds matching keys by glob pattern (e.g. tenant:123:session:*).
   * @param {string} pattern 
   */
  async keys(pattern) {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.warn({ pattern, err: error.message }, 'Cache keys error; falling back to memory mock');
      return await this.fallbackMock.keys(pattern);
    }
  }
}

export default new CacheService();
