const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const config = require('../src/config/env');
const { getRedisClient } = require('../src/config/redis');
const { User } = require('../src/models');

describe('System Capabilities & Production Readiness Guard (/api/v1/system)', () => {
  let userToken;
  let testUser;

  const createToken = (user) =>
    jwt.sign(
      {
        id: user.id,
        role: user.role,
        isActive: user.isActive !== false,
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.accessExpiresIn,
        algorithm: config.jwt.algorithm,
      }
    );

  beforeAll(async () => {
    testUser = await User.create({
      name: 'Capabilities Test User',
      email: `syscaps_${Date.now()}@example.com`,
      passwordHash: 'hashed_password_placeholder',
      role: 'candidate',
      isActive: true,
    });
    userToken = createToken(testUser);
  });

  afterAll(async () => {
    if (testUser) await testUser.destroy();
  });

  describe('GET /api/v1/system/capabilities', () => {
    test('1. Rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/system/capabilities');
      expect(res.status).toBe(401);
    });

    test('2. Returns active capability providers without exposing secrets', async () => {
      const res = await request(app)
        .get('/api/v1/system/capabilities')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('aiProvider');
      expect(res.body).toHaveProperty('executionProvider');
      expect(res.body).toHaveProperty('redis');

      expect(['gemini', 'mock']).toContain(res.body.aiProvider);
      expect(['judge0', 'mock']).toContain(res.body.executionProvider);
      expect(['redis', 'in-memory']).toContain(res.body.redis);

      // Verify no secrets or credentials leaked
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('secret');
      expect(bodyStr).not.toContain('key');
      expect(bodyStr).not.toContain('password');
      expect(bodyStr).not.toContain('pass');
    });
  });

  describe('Readiness Probe In-Memory Fallback Behavior', () => {
    test('3. /health/ready identifies in-memory redis fallback explicitly', async () => {
      const client = getRedisClient();
      const res = await request(app).get('/health/ready');

      if (client.isMock || config.redis.mock) {
        expect(res.body.checks.redis).toBe('in-memory-fallback');
      } else {
        expect(res.body.checks.redis).toBe('connected');
      }
    });

    test('4. In production mode without ALLOW_INMEMORY_REDIS, returns 503 if redis is mock', async () => {
      const origEnv = config.env;
      const origAllow = config.allowInMemoryRedis;
      const client = getRedisClient();

      if (client.isMock || config.redis.mock) {
        config.env = 'production';
        config.allowInMemoryRedis = false;

        const res = await request(app).get('/health/ready');
        expect(res.status).toBe(503);
        expect(res.body.status).toBe('unhealthy');
        expect(res.body.checks.redis).toBe('in-memory-fallback');

        // With ALLOW_INMEMORY_REDIS = true
        config.allowInMemoryRedis = true;
        const resAllowed = await request(app).get('/health/ready');
        expect(resAllowed.status).toBe(200);
        expect(resAllowed.body.status).toBe('ready');

        config.env = origEnv;
        config.allowInMemoryRedis = origAllow;
      }
    });
  });
});
