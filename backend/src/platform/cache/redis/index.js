import { Redis } from '@upstash/redis';
import env from '#@/config/env.js';
import logger from '#@/platform/logger/index.js';

/**
 * In-memory fallback mock for Redis client.
 * Ensures the application and automated tests continue functioning seamlessly during local development
 * or when Upstash Redis REST credentials are not provided or reachable.
 */
export class InMemoryRedisMock {
  constructor() {
    this.store = new Map();
    this.expirations = new Map();
  }

  _checkExpiry(key) {
    if (this.expirations.has(key) && Date.now() > this.expirations.get(key)) {
      this.store.delete(key);
      this.expirations.delete(key);
    }
  }

  async get(key) {
    this._checkExpiry(key);
    return this.store.has(key) ? this.store.get(key) : null;
  }

  async set(key, value, options = {}) {
    const valStr = typeof value === 'string' ? value : JSON.stringify(value);
    this.store.set(key, valStr);
    if (options && options.ex) {
      this.expirations.set(key, Date.now() + options.ex * 1000);
    }
    return 'OK';
  }

  async setex(key, durationInSeconds, value) {
    return this.set(key, value, { ex: durationInSeconds });
  }

  async del(...keys) {
    const flatKeys = Array.isArray(keys[0]) ? keys[0] : keys;
    let count = 0;
    for (const key of flatKeys) {
      if (this.store.has(key)) {
        this.store.delete(key);
        this.expirations.delete(key);
        count++;
      }
    }
    return count;
  }

  async exists(key) {
    this._checkExpiry(key);
    return this.store.has(key) ? 1 : 0;
  }

  async incr(key) {
    this._checkExpiry(key);
    const current = Number(this.store.get(key) || 0);
    const updated = current + 1;
    this.store.set(key, String(updated));
    return updated;
  }

  async expire(key, durationInSeconds) {
    this._checkExpiry(key);
    if (!this.store.has(key)) return 0;
    this.expirations.set(key, Date.now() + durationInSeconds * 1000);
    return 1;
  }

  async keys(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const matched = [];
    for (const key of this.store.keys()) {
      this._checkExpiry(key);
      if (this.store.has(key) && regex.test(key)) {
        matched.push(key);
      }
    }
    return matched;
  }
}

let redisClient;

try {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    redisClient = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    logger.info('Upstash Redis REST client initialized successfully.');
  } else {
    logger.warn('Upstash Redis REST credentials missing or empty: Running with In-Memory Redis Mock. Do not use in production cluster mode.');
    redisClient = new InMemoryRedisMock();
  }
} catch (error) {
  logger.error({ err: error.message }, 'Failed to initialize Upstash Redis client; using InMemoryRedisMock');
  redisClient = new InMemoryRedisMock();
}

export default redisClient;
