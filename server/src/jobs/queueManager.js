const { Queue } = require('bullmq');
const { getRedisClient, createClientOptions } = require('../config/redis');
const { logger } = require('../utils/logger');
const config = require('../config/env');

const QUEUE_NAMES = {
  CODE_EXECUTION: 'code-execution',
  AI_EVALUATION: 'ai-evaluation',
  RESUME_PARSING: 'resume-parsing',
};

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: {
    age: 3600, // keep for 1 hour
    count: 1000,
  },
  removeOnFail: {
    age: 86400, // keep failed jobs for 24 hours
    count: 5000,
  },
};

/**
 * In-memory Mock Job for tests / mock environments
 */
class MockJob {
  constructor(queueName, id, name, data, opts = {}) {
    this.queueName = queueName;
    this.id = id;
    this.name = name;
    this.data = data;
    this.opts = { ...DEFAULT_JOB_OPTIONS, ...opts };
    this.state = 'waiting';
    this.attemptsMade = 0;
    this.progress = 0;
    this.returnvalue = null;
    this.failedReason = null;
    this.timestamp = Date.now();
  }

  async getState() {
    return this.state;
  }

  async updateProgress(val) {
    this.progress = val;
  }
}

/**
 * In-memory Mock Queue for testing and non-Redis environments
 */
class MockQueue {
  constructor(name) {
    this.name = name;
    this.jobs = new Map();
    this.jobCounter = 1;
    this.isPaused = false;
  }

  async add(name, data, opts = {}) {
    const jobId = opts.jobId || String(this.jobCounter++);
    const job = new MockJob(this.name, jobId, name, data, opts);
    this.jobs.set(jobId, job);
    logger.debug({ queue: this.name, jobId, name }, '[MOCK-QUEUE] Job enqueued');

    // Asynchronously process with any registered mock worker
    if (MockQueue.processorMap.has(this.name)) {
      setTimeout(async () => {
        const processor = MockQueue.processorMap.get(this.name);
        try {
          job.state = 'active';
          job.attemptsMade++;
          const result = await processor(job);
          job.state = 'completed';
          job.returnvalue = result;
        } catch (err) {
          job.failedReason = err.message;
          if (job.attemptsMade < (job.opts.attempts || 3)) {
            job.state = 'delayed';
          } else {
            job.state = 'failed';
          }
        }
      });
    }

    return job;
  }

  async getJob(jobId) {
    return this.jobs.get(String(jobId)) || null;
  }

  async pause() {
    this.isPaused = true;
  }

  async resume() {
    this.isPaused = false;
  }

  async close() {
    this.jobs.clear();
  }
}

MockQueue.processorMap = new Map();

/**
 * Central Queue Manager
 */
class QueueManager {
  constructor() {
    this.queues = new Map();
    this.isMock = false;
  }

  init() {
    const client = getRedisClient();
    this.isMock = client.isMock || config.env === 'test' || config.redis.mock;

    const queueList = Object.values(QUEUE_NAMES);
    for (const name of queueList) {
      if (this.isMock) {
        this.queues.set(name, new MockQueue(name));
      } else {
        const redisOptions = createClientOptions();
        const queue = new Queue(name, {
          connection: redisOptions,
          defaultJobOptions: DEFAULT_JOB_OPTIONS,
        });
        this.queues.set(name, queue);
      }
    }

    logger.info(
      { queues: queueList, mode: this.isMock ? 'in-memory-mock' : 'live-redis' },
      '[QUEUE-MANAGER] Background queues initialized'
    );
  }

  /**
   * Get queue by name
   * @param {string} queueName
   * @returns {Queue|MockQueue}
   */
  getQueue(queueName) {
    if (!this.queues.has(queueName)) {
      this.init();
    }
    const q = this.queues.get(queueName);
    if (!q) {
      throw new Error(`Queue '${queueName}' not found.`);
    }
    return q;
  }

  /**
   * Enqueue a job with defaults
   * @param {string} queueName
   * @param {string} jobName
   * @param {object} data
   * @param {object} opts
   */
  async addJob(queueName, jobName, data, opts = {}) {
    const queue = this.getQueue(queueName);
    return queue.add(jobName, data, opts);
  }

  /**
   * Get standardized status of a background job
   * @param {string} queueName
   * @param {string} jobId
   */
  async getJobStatus(queueName, jobId) {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);
    if (!job) return null;

    const state = typeof job.getState === 'function' ? await job.getState() : job.state;
    return {
      id: job.id,
      name: job.name,
      queue: queueName,
      state,
      progress: job.progress || 0,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason || null,
      result: job.returnvalue || null,
      timestamp: job.timestamp,
    };
  }

  /**
   * Gracefully close all queues
   */
  async closeAll() {
    for (const queue of this.queues.values()) {
      try {
        await queue.close();
      } catch (err) {
        logger.warn({ error: err.message }, '[QUEUE-MANAGER] Error closing queue');
      }
    }
    this.queues.clear();
  }
}

const queueManager = new QueueManager();

module.exports = {
  queueManager,
  QUEUE_NAMES,
  DEFAULT_JOB_OPTIONS,
  MockQueue,
};
