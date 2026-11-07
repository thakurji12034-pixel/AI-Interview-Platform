const request = require('supertest');
const app = require('../src/app');
const cacheService = require('../src/services/cacheService');
const { queueManager, QUEUE_NAMES } = require('../src/jobs/queueManager');
const { startWorker, stopWorker } = require('../src/worker');
const { getRedisClient, isRedisHealthy } = require('../src/config/redis');

describe('Redis, Cache Service & Background Job Infrastructure', () => {
  beforeAll(async () => {
    startWorker();
  });

  afterAll(async () => {
    await stopWorker();
    await queueManager.closeAll();
  });

  beforeEach(async () => {
    await cacheService.flush();
  });

  describe('Redis Client & Health Probes', () => {
    test('1. Redis client initializes and passes health check', async () => {
      const healthy = await isRedisHealthy();
      expect(healthy).toBe(true);

      const client = getRedisClient();
      expect(client).toBeDefined();
      const ping = await client.ping();
      expect(ping).toBe('PONG');
    });

    test('2. GET /health/ready reports healthy database and redis checks (200 OK)', async () => {
      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.checks).toEqual({
        database: 'connected',
        redis: 'connected',
      });
      expect(res.body.uptime).toBeGreaterThanOrEqual(0);
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('Cache Service (/services/cacheService)', () => {
    test('3. Cache set and get correctly serializes and deserializes JSON values', async () => {
      const sampleData = { role: 'admin', permissions: ['all'], nested: { active: true } };
      const setResult = await cacheService.set('test:json', sampleData, 60);
      expect(setResult).toBe(true);

      const retrieved = await cacheService.get('test:json');
      expect(retrieved).toEqual(sampleData);
    });

    test('4. Cache has returns true for existing key and false for non-existing', async () => {
      await cacheService.set('test:exists', 'val', 60);
      expect(await cacheService.has('test:exists')).toBe(true);
      expect(await cacheService.has('test:does_not_exist')).toBe(false);
    });

    test('5. Cache del removes key from storage', async () => {
      await cacheService.set('test:remove', { id: 1 }, 60);
      expect(await cacheService.get('test:remove')).not.toBeNull();

      const delResult = await cacheService.del('test:remove');
      expect(delResult).toBe(true);
      expect(await cacheService.get('test:remove')).toBeNull();
    });

    test('6. Cache delPattern removes all matching wildcards', async () => {
      await cacheService.set('user:101:profile', { name: 'A' }, 60);
      await cacheService.set('user:102:profile', { name: 'B' }, 60);
      await cacheService.set('interview:501', { code: 'X' }, 60);

      const deletedCount = await cacheService.delPattern('user:*');
      expect(deletedCount).toBeGreaterThanOrEqual(2);

      expect(await cacheService.get('user:101:profile')).toBeNull();
      expect(await cacheService.get('user:102:profile')).toBeNull();
      expect(await cacheService.get('interview:501')).not.toBeNull();
    });

    test('7. Cache key TTL expires and returns null after expiry', async () => {
      // Set with 1 second TTL
      await cacheService.set('test:expire', { temp: true }, 1);
      expect(await cacheService.get('test:expire')).not.toBeNull();

      // Wait 1.1s for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));
      expect(await cacheService.get('test:expire')).toBeNull();
    });
  });

  describe('Background Job Queues & Worker Processing (/jobs)', () => {
    test('8. Enqueuing code execution job creates job with default retry and backoff options', async () => {
      const job = await queueManager.addJob(QUEUE_NAMES.CODE_EXECUTION, 'runCode', {
        submissionId: 'sub-test-123',
        language: 'javascript',
        code: 'console.log("hello")',
      });

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.opts.attempts).toBe(3);
      expect(job.opts.backoff).toEqual({ type: 'exponential', delay: 1000 });
    });

    test('9. Job status helper returns standardized progress and completion state', async () => {
      const job = await queueManager.addJob(QUEUE_NAMES.AI_EVALUATION, 'evaluateInterview', {
        interviewId: 'int-test-456',
      });

      // Wait for mock worker processor to complete job
      await new Promise((resolve) => setTimeout(resolve, 250));

      const status = await queueManager.getJobStatus(QUEUE_NAMES.AI_EVALUATION, job.id);
      expect(status).toBeDefined();
      expect(status.id).toBe(String(job.id));
      expect(status.queue).toBe(QUEUE_NAMES.AI_EVALUATION);
      expect(status.state).toBe('completed');
      expect(status.result).toEqual(
        expect.objectContaining({
          status: 'evaluated',
          interviewId: 'int-test-456',
        })
      );
    });

    test('10. Resume parsing queue processes resume and updates progress', async () => {
      const job = await queueManager.addJob(QUEUE_NAMES.RESUME_PARSING, 'parseResume', {
        candidateId: 'cand-789',
      });

      await new Promise((resolve) => setTimeout(resolve, 250));

      const status = await queueManager.getJobStatus(QUEUE_NAMES.RESUME_PARSING, job.id);
      expect(status).toBeDefined();
      expect(status.state).toBe('completed');
      expect(status.result).toEqual(
        expect.objectContaining({
          status: 'parsed',
          candidateId: 'cand-789',
        })
      );
    });
  });
});
