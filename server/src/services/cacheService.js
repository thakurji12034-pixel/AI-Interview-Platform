const { getRedisClient } = require('../config/redis');
const { logger } = require('../utils/logger');

const DEFAULT_TTL = 300; // 5 minutes default

class CacheService {
  constructor() {
    this.prefix = 'cache:';
  }

  _getKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Retrieve parsed JSON from cache
   * @param {string} key
   * @returns {Promise<any|null>}
   */
  async get(key) {
    try {
      const client = getRedisClient();
      const raw = await client.get(this._getKey(key));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      logger.warn({ key, error: err.message }, '[CACHE] Failed to get cache key');
      return null;
    }
  }

  /**
   * Set JSON value in cache with explicit TTL
   * @param {string} key
   * @param {any} value
   * @param {number} ttlSeconds
   * @returns {Promise<boolean>}
   */
  async set(key, value, ttlSeconds = DEFAULT_TTL) {
    try {
      const client = getRedisClient();
      const serialized = JSON.stringify(value);
      await client.set(this._getKey(key), serialized, 'EX', ttlSeconds);
      return true;
    } catch (err) {
      logger.warn({ key, error: err.message }, '[CACHE] Failed to set cache key');
      return false;
    }
  }

  /**
   * Delete a single cache key
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async del(key) {
    try {
      const client = getRedisClient();
      await client.del(this._getKey(key));
      return true;
    } catch (err) {
      logger.warn({ key, error: err.message }, '[CACHE] Failed to delete cache key');
      return false;
    }
  }

  /**
   * Delete all cache keys matching a pattern (e.g. 'user:*')
   * @param {string} pattern
   * @returns {Promise<number>} count of deleted keys
   */
  async delPattern(pattern) {
    try {
      const client = getRedisClient();
      const keys = await client.keys(this._getKey(pattern));
      if (!keys || keys.length === 0) return 0;
      const count = await client.del(...keys);
      return count;
    } catch (err) {
      logger.warn({ pattern, error: err.message }, '[CACHE] Failed to delete pattern');
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async has(key) {
    try {
      const client = getRedisClient();
      const val = await client.get(this._getKey(key));
      return val !== null;
    } catch (err) {
      logger.warn({ key, error: err.message }, '[CACHE] Failed to check key existence');
      return false;
    }
  }

  /**
   * Flush all keys in the application cache namespace
   * @returns {Promise<boolean>}
   */
  async flush() {
    try {
      const client = getRedisClient();
      const keys = await client.keys(`${this.prefix}*`);
      if (keys && keys.length > 0) {
        await client.del(...keys);
      }
      return true;
    } catch (err) {
      logger.warn({ error: err.message }, '[CACHE] Failed to flush cache');
      return false;
    }
  }
}

module.exports = new CacheService();
