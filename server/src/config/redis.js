const EventEmitter = require('events');
const Redis = require('ioredis');
const config = require('./env');
const { logger } = require('../utils/logger');

/**
 * In-memory fallback Redis mock for environments without a live Redis instance
 * (e.g. CI without Redis service, test runs, or local developer workstations).
 */
class InMemoryRedisMock extends EventEmitter {
  constructor(sharedStore = new Map()) {
    super();
    this.store = sharedStore;
    this.status = 'ready';
    this.isMock = true;
    process.nextTick(() => {
      this.emit('connect');
      this.emit('ready');
    });
  }

  async get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, ...args) {
    let expiresAt = null;
    for (let i = 0; i < args.length; i++) {
      const arg = String(args[i]).toUpperCase();
      if (arg === 'EX' && args[i + 1] !== undefined) {
        expiresAt = Date.now() + Number(args[i + 1]) * 1000;
        i++;
      } else if (arg === 'PX' && args[i + 1] !== undefined) {
        expiresAt = Date.now() + Number(args[i + 1]);
        i++;
      }
    }
    this.store.set(key, { value: String(value), expiresAt });
    return 'OK';
  }

  async del(...keys) {
    const flatKeys = keys.flat();
    let deletedCount = 0;
    for (const k of flatKeys) {
      if (this.store.delete(k)) deletedCount++;
    }
    return deletedCount;
  }

  async expire(key, seconds) {
    const item = this.store.get(key);
    if (!item) return 0;
    item.expiresAt = Date.now() + Number(seconds) * 1000;
    return 1;
  }

  async ttl(key) {
    const item = this.store.get(key);
    if (!item) return -2;
    if (!item.expiresAt) return -1;
    const remainingMs = item.expiresAt - Date.now();
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : -2;
  }

  async keys(pattern = '*') {
    const now = Date.now();
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    const results = [];
    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.store.delete(key);
        continue;
      }
      if (regex.test(key)) results.push(key);
    }
    return results;
  }

  async flushall() {
    this.store.clear();
    return 'OK';
  }

  async flushdb() {
    return this.flushall();
  }

  async ping() {
    return 'PONG';
  }

  async quit() {
    this.status = 'end';
    this.emit('end');
    return 'OK';
  }

  async disconnect() {
    return this.quit();
  }

  duplicate() {
    return new InMemoryRedisMock(this.store);
  }

  // Fallback for Lua evaluation (used by BullMQ and rate limiters)
  async eval(script, numkeys, ...args) {
    // If rate-limit-redis script
    if (typeof script === 'string' && script.includes('incr')) {
      const key = args[0];
      const current = await this.get(key);
      const val = current ? parseInt(current, 10) + 1 : 1;
      await this.set(key, val);
      return [val, 1000];
    }
    return 1;
  }

  async evalsha(...args) {
    return this.eval(...args);
  }
}

let redisClient = null;

function createClientOptions(overrides = {}) {
  return {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    enableOfflineQueue: false, // Do not hang HTTP requests when Redis is disconnected
    maxRetriesPerRequest: 1, // Fail fast on store calls
    enableReadyCheck: true,
    connectTimeout: 3000,
    retryStrategy(times) {
      if (times > 5 && config.env === 'test') return null; // Stop retrying immediately in tests
      const delay = Math.min(times * 200, 3000);
      return delay;
    },
    ...overrides,
  };
}

/**
 * Initializes or returns the singleton Redis client.
 * Automatically falls back to InMemoryRedisMock in test environment or if configured/unavailable.
 */
function getRedisClient() {
  if (redisClient) return redisClient;

  if (config.redis.mock || config.env === 'test') {
    logger.info('[REDIS] Initialized in-memory Redis mock (test/mock mode)');
    redisClient = new InMemoryRedisMock();
    return redisClient;
  }

  try {
    const client = new Redis(createClientOptions());

    client.on('connect', () => {
      logger.info({ host: config.redis.host, port: config.redis.port }, '[REDIS] Connected to Redis server');
    });

    client.on('ready', () => {
      logger.info('[REDIS] Connection ready');
    });

    client.on('error', (err) => {
      logger.warn({ error: err.message }, '[REDIS] Connection error, operating in fallback mode if necessary');
    });

    client.on('close', () => {
      logger.warn('[REDIS] Connection closed');
    });

    redisClient = client;
    return redisClient;
  } catch (err) {
    logger.warn({ error: err.message }, '[REDIS] Failed to create Redis client, falling back to in-memory mock');
    redisClient = new InMemoryRedisMock();
    return redisClient;
  }
}

/**
 * Check if Redis is actively ready
 */
function isRedisReady() {
  if (!redisClient) return false;
  if (redisClient.isMock) return true;
  return redisClient.status === 'ready';
}

/**
 * Check if Redis is healthy (used by health probes)
 */
async function isRedisHealthy() {
  try {
    const client = getRedisClient();
    if (client.isMock) return true;
    if (client.status !== 'ready') return false;
    const res = await client.ping();
    return res === 'PONG';
  } catch (err) {
    logger.error({ error: err.message }, '[REDIS] Health check failed');
    return false;
  }
}

/**
 * Close Redis connection gracefully on server shutdown
 */
async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      redisClient.disconnect();
    } finally {
      redisClient = null;
    }
  }
}

module.exports = {
  getRedisClient,
  createClientOptions,
  InMemoryRedisMock,
  isRedisReady,
  isRedisHealthy,
  closeRedis,
};
