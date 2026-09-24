import { Redis } from '@upstash/redis';
import env from '#ai/config/env.js';
import logger from '#ai/platform/logger.js';

/**
 * In-memory fallback mock for Redis client on the AI Platform.
 * Ensures the AI Platform can run seamlessly in local dev/offline mode.
 */
class InMemoryRedisMock {
  constructor() {
    this.store = new Map();
    this.lists = new Map();
    this.expirations = new Map();
  }

  _checkExpiry(key) {
    if (this.expirations.has(key) && Date.now() > this.expirations.get(key)) {
      this.store.delete(key);
      this.lists.delete(key);
      this.expirations.delete(key);
    }
  }

  async ping() {
    return 'PONG';
  }

  async get(key) {
    this._checkExpiry(key);
    const val = this.store.get(key);
    return val !== undefined ? val : null;
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
      if (this.store.has(key) || this.lists.has(key)) {
        this.store.delete(key);
        this.lists.delete(key);
        this.expirations.delete(key);
        count++;
      }
    }
    return count;
  }

  async exists(key) {
    this._checkExpiry(key);
    return (this.store.has(key) || this.lists.has(key)) ? 1 : 0;
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
    if (!this.store.has(key) && !this.lists.has(key)) return 0;
    this.expirations.set(key, Date.now() + durationInSeconds * 1000);
    return 1;
  }

  // List operations
  async rpush(key, ...values) {
    this._checkExpiry(key);
    if (!this.lists.has(key)) {
      this.lists.set(key, []);
    }
    const list = this.lists.get(key);
    list.push(...values);
    return list.length;
  }

  async lrange(key, start, stop) {
    this._checkExpiry(key);
    if (!this.lists.has(key)) return [];
    const list = this.lists.get(key);
    const len = list.length;
    let s = start < 0 ? len + start : start;
    let e = stop < 0 ? len + stop : stop;
    s = Math.max(0, s);
    e = Math.min(len - 1, e);
    if (s > e) return [];
    return list.slice(s, e + 1);
  }

  async ltrim(key, start, stop) {
    this._checkExpiry(key);
    if (!this.lists.has(key)) return 'OK';
    const list = this.lists.get(key);
    const len = list.length;
    let s = start < 0 ? len + start : start;
    let e = stop < 0 ? len + stop : stop;
    s = Math.max(0, s);
    e = Math.min(len - 1, e);
    if (s > e) {
      this.lists.set(key, []);
    } else {
      this.lists.set(key, list.slice(s, e + 1));
    }
    return 'OK';
  }

  async llen(key) {
    this._checkExpiry(key);
    if (!this.lists.has(key)) return 0;
    return this.lists.get(key).length;
  }

  async scan(cursor, options = {}) {
    const pattern = options.match;
    const regex = pattern ? new RegExp('^' + pattern.replace(/\*/g, '.*') + '$') : null;
    const allKeys = [...this.store.keys(), ...this.lists.keys()];
    const matched = [];
    for (const key of allKeys) {
      this._checkExpiry(key);
      if (regex) {
        if (regex.test(key)) matched.push(key);
      } else {
        matched.push(key);
      }
    }
    return [0, matched];
  }
}

const isDummyRedis = !env.UPSTASH_REDIS_REST_URL ||
  env.UPSTASH_REDIS_REST_URL.includes('dummy') ||
  env.UPSTASH_REDIS_REST_URL.includes('localhost') ||
  env.UPSTASH_REDIS_REST_URL.includes('your-instance');

let redis;
if (isDummyRedis) {
  redis = new InMemoryRedisMock();
} else {
  redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
}

/**
 * Wrapper with structured logging for all Redis operations.
 */
export const cache = {
  /**
   * Set a key with optional TTL in seconds.
   */
  async set(key, value, ttlSeconds = null) {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      return redis.setex(key, ttlSeconds, serialized);
    }
    return redis.set(key, serialized);
  },

  /**
   * Get and parse a JSON-serialized value.
   */
  async get(key) {
    const value = await redis.get(key);
    if (value === null || value === undefined) return null;
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return value; // return raw string if not valid JSON
    }
  },

  /**
   * Delete one or more keys.
   */
  async del(...keys) {
    return redis.del(...keys);
  },

  /**
   * Check if a key exists.
   */
  async exists(key) {
    const result = await redis.exists(key);
    return result === 1;
  },

  /**
   * Append a JSON element to a Redis list (RPUSH) and set TTL.
   */
  async listAppend(key, value, ttlSeconds = null) {
    const serialized = JSON.stringify(value);
    await redis.rpush(key, serialized);
    if (ttlSeconds) await redis.expire(key, ttlSeconds);
  },

  /**
   * Get all elements of a Redis list, parsed.
   */
  async listGetAll(key) {
    const items = await redis.lrange(key, 0, -1);
    return items.map((item) => {
      try { return JSON.parse(item); } catch { return item; }
    });
  },

  /**
   * Trim a list to keep only the last N elements.
   */
  async listTrim(key, keepLast) {
    return redis.ltrim(key, -keepLast, -1);
  },

  /**
   * Return the length of a list.
   */
  async listLen(key) {
    return redis.llen(key);
  },

  /**
   * Atomic increment and get — used for rate limiting.
   */
  async incr(key) {
    return redis.incr(key);
  },

  /**
   * Set a TTL on an existing key.
   */
  async expire(key, ttlSeconds) {
    return redis.expire(key, ttlSeconds);
  },

  /**
   * Pattern-based key scan. Returns matching keys.
   * Note: Use sparingly — O(N) scan across keyspace.
   */
  async scan(pattern) {
    const results = [];
    let cursor = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = Number(nextCursor);
      results.push(...keys);
    } while (cursor !== 0);
    return results;
  },
};

// Verify connectivity at startup
export const connectCache = async () => {
  try {
    await redis.ping();
    logger.info('[AI Cache] Upstash Redis connected');
  } catch (error) {
    logger.error({ err: error }, '[AI Cache] Upstash Redis connection failed');
    // Non-fatal — AI can degrade gracefully without cache
  }
};

export default cache;
