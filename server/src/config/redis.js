
const EventEmitter = require('events');
const Redis = require('ioredis');

const config = require('./env');
const { logger } = require('../utils/logger');

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
      const option = String(args[i]).toUpperCase();

      if (option === 'EX' && args[i + 1] !== undefined) {
        expiresAt = Date.now() + Number(args[++i]) * 1000;
      } else if (option === 'PX' && args[i + 1] !== undefined) {
        expiresAt = Date.now() + Number(args[++i]);
      }
    }

    this.store.set(key, {
      value: String(value),
      expiresAt,
    });

    return 'OK';
  }

  async del(...keys) {
    let deleted = 0;

    for (const key of keys.flat()) {
      if (this.store.delete(key)) deleted++;
    }

    return deleted;
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

    const remaining = item.expiresAt - Date.now();

    return remaining > 0 ? Math.ceil(remaining / 1000) : -2;
  }

  async keys(pattern = '*') {
    const regex = new RegExp(
      `^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`
    );

    const results = [];

    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt && Date.now() > item.expiresAt) {
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

  async eval(script, numkeys, ...args) {
    if (typeof script === 'string' && script.includes('incr')) {
      const key = args[0];
      const current = await this.get(key);
      const value = current ? parseInt(current, 10) + 1 : 1;

      await this.set(key, value);

      return [value, 1000];
    }

    return 1;
  }

  async evalsha(...args) {
    return this.eval(...args);
  }
}

let redisClient = null;

function createClientOptions(overrides = {}) {
  const options = {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    connectTimeout: 10000,

    retryStrategy(times) {
      if (times > 5 && config.env === 'test') {
        return null;
      }

      return Math.min(times * 500, 3000);
    },

    ...overrides,
  };

  // Use TLS only when explicitly enabled for host/port connections.
  if (
    !process.env.REDIS_URL &&
    process.env.REDIS_TLS === 'true'
  ) {
    options.tls = {
      minVersion: 'TLSv1.2',
    };
  }

  return options;
}

function getRedisClient() {
  if (redisClient) return redisClient;

  if (config.redis.mock || config.env === 'test') {
    logger.warn('[REDIS] Using in-memory Redis mock');

    redisClient = new InMemoryRedisMock();

    return redisClient;
  }

  try {
    const options = createClientOptions();

    if (process.env.REDIS_URL) {
      // Supports redis:// and rediss:// connection URLs.
      redisClient = new Redis(process.env.REDIS_URL, options);
    } else {
      redisClient = new Redis({
        ...options,
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      });
    }

    redisClient.on('connect', () => {
      logger.info('[REDIS] Connected to Redis server');
    });

    redisClient.on('ready', () => {
      logger.info('[REDIS] Connection ready');
    });

    redisClient.on('error', (err) => {
      logger.error(
        { error: err.message },
        '[REDIS] Connection error'
      );
    });

    redisClient.on('close', () => {
      logger.warn('[REDIS] Connection closed');
    });

    return redisClient;
  } catch (err) {
    logger.error(
      { error: err.message },
      '[REDIS] Failed to initialize Redis'
    );

    throw err;
  }
}

function isRedisReady() {
  if (!redisClient) return false;

  if (redisClient.isMock) return true;

  return redisClient.status === 'ready';
}

async function isRedisHealthy() {
  try {
    const client = getRedisClient();

    if (client.isMock) return true;
    if (client.status !== 'ready') return false;

    return (await client.ping()) === 'PONG';
  } catch (err) {
    logger.error(
      { error: err.message },
      '[REDIS] Health check failed'
    );

    return false;
  }
}

async function closeRedis() {
  if (!redisClient) return;

  const client = redisClient;
  redisClient = null;

  try {
    if (client.isMock) {
      await client.quit();
    } else if (client.status !== 'end') {
      await client.quit();
    }
  } catch (err) {
    logger.warn(
      { error: err.message },
      '[REDIS] Graceful shutdown failed; disconnecting'
    );

    try {
      client.disconnect();
    } catch {
      // Ignore disconnect errors during shutdown.
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
