const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient, isRedisReady } = require('../config/redis');
const config = require('../config/env');
const { logger } = require('../utils/logger');

/**
 * Creates a rate limiter instance with optional RedisStore backing.
 * Automatically falls back to express-rate-limit MemoryStore when Redis is unavailable or in mock mode.
 */
function createRateLimiter(options = {}) {
  const { prefix = 'general', ...rateLimitOpts } = options;
  const isTest = config.env === 'test';
  const client = getRedisClient();
  const useRedisStore = !isTest && !client.isMock && config.redis.enabled && isRedisReady();

  let store;
  if (useRedisStore) {
    try {
      store = new RedisStore({
        sendCommand: (...args) => {
          if (!isRedisReady()) {
            throw new Error('Redis not ready');
          }
          return client.call(...args);
        },
        prefix: `rl:${prefix}:`,
      });
      logger.info({ prefix }, '[RATE-LIMIT] Redis store attached');
    } catch (err) {
      logger.warn({ error: err.message }, '[RATE-LIMIT] Failed to attach Redis store, falling back to in-memory');
    }
  }

  return rateLimit({
    windowMs: rateLimitOpts.windowMs || 15 * 60 * 1000,
    limit: rateLimitOpts.max || rateLimitOpts.limit || 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    passOnStoreError: true, // Never block requests if Redis store encounters errors
    skip: () => isTest, // Skip during automated test suites
    store,
    validate: { xForwardedForHeader: false },
    message: {
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: rateLimitOpts.message || 'Too many requests from this IP. Please try again later.',
      },
      message: rateLimitOpts.message || 'Too many requests from this IP. Please try again later.',
    },
    ...rateLimitOpts,
  });
}

// Strict limiter for authentication endpoints: max 20 requests per 15 minutes
const authLimiter = createRateLimiter({
  prefix: 'auth',
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
});

// General limiter for sensitive mutations or standard API requests
const generalLimiter = createRateLimiter({
  prefix: 'api',
  windowMs: 15 * 60 * 1000,
  max: 300,
});

module.exports = {
  createRateLimiter,
  authLimiter,
  generalLimiter,
};
