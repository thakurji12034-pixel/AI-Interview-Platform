const { Worker } = require('bullmq');
const { getRedisClient, createClientOptions } = require('./config/redis');
const { QUEUE_NAMES, MockQueue } = require('./jobs/queueManager');
const { logger } = require('./utils/logger');
const config = require('./config/env');

const activeWorkers = [];

/**
 * Job Processors (Modular handlers prepared for Phase 5, 6, 7 integration)
 */
async function processCodeExecution(job) {
  logger.info({ jobId: job.id, submissionId: job.data.submissionId }, '[WORKER] Processing code execution job');
  await job.updateProgress(20);

  // Simulates sandbox execution pipeline / Judge0 API call
  // Pluggable with Judge0 adapter implemented in Phase 5
  await new Promise((resolve) => setTimeout(resolve, 100));
  await job.updateProgress(100);

  return {
    status: 'completed',
    submissionId: job.data.submissionId,
    executedAt: new Date().toISOString(),
  };
}

async function processAiEvaluation(job) {
  logger.info({ jobId: job.id, interviewId: job.data.interviewId }, '[WORKER] Processing AI evaluation job');
  await job.updateProgress(25);

  // Pluggable with Gemini AI evaluation pipeline implemented in Phase 7
  await new Promise((resolve) => setTimeout(resolve, 100));
  await job.updateProgress(100);

  return {
    status: 'evaluated',
    interviewId: job.data.interviewId,
    evaluatedAt: new Date().toISOString(),
  };
}

async function processResumeParsing(job) {
  logger.info({ jobId: job.id, candidateId: job.data.candidateId }, '[WORKER] Processing resume parsing job');
  await job.updateProgress(30);

  // Pluggable with PDF parsing & skill extraction implemented in Phase 6
  await new Promise((resolve) => setTimeout(resolve, 100));
  await job.updateProgress(100);

  return {
    status: 'parsed',
    candidateId: job.data.candidateId,
    parsedAt: new Date().toISOString(),
  };
}

const PROCESSORS = {
  [QUEUE_NAMES.CODE_EXECUTION]: processCodeExecution,
  [QUEUE_NAMES.AI_EVALUATION]: processAiEvaluation,
  [QUEUE_NAMES.RESUME_PARSING]: processResumeParsing,
};

function startWorker() {
  const client = getRedisClient();
  const isMock = client.isMock || config.env === 'test' || config.redis.mock;

  logger.info({ mode: isMock ? 'in-memory-mock' : 'live-redis' }, '[WORKER] Starting background job workers');

  if (isMock) {
    // Register mock processors for immediate or async local dispatch
    for (const [queueName, processor] of Object.entries(PROCESSORS)) {
      MockQueue.processorMap.set(queueName, processor);
      logger.info({ queue: queueName }, '[WORKER] Registered in-memory mock processor');
    }
    return activeWorkers;
  }

  const redisOptions = createClientOptions();

  for (const [queueName, processor] of Object.entries(PROCESSORS)) {
    const worker = new Worker(queueName, processor, {
      connection: redisOptions,
      concurrency: queueName === QUEUE_NAMES.CODE_EXECUTION ? 2 : 5,
    });

    worker.on('completed', (job, result) => {
      logger.info({ queue: queueName, jobId: job.id, result }, '[WORKER] Job completed successfully');
    });

    worker.on('failed', (job, err) => {
      logger.error(
        { queue: queueName, jobId: job?.id, error: err.message, attemptsMade: job?.attemptsMade },
        '[WORKER] Job failed'
      );
    });

    worker.on('stalled', (jobId) => {
      logger.warn({ queue: queueName, jobId }, '[WORKER] Job stalled, retrying');
    });

    worker.on('error', (err) => {
      logger.error({ queue: queueName, error: err.message }, '[WORKER] Worker system error');
    });

    activeWorkers.push(worker);
    logger.info({ queue: queueName }, '[WORKER] BullMQ worker listening');
  }

  return activeWorkers;
}

async function stopWorker() {
  logger.info('[WORKER] Gracefully shutting down workers...');
  for (const worker of activeWorkers) {
    try {
      await worker.close();
    } catch (err) {
      logger.warn({ error: err.message }, '[WORKER] Error closing worker');
    }
  }
  activeWorkers.length = 0;
  MockQueue.processorMap.clear();
  logger.info('[WORKER] All workers stopped cleanly');
}

// Handle termination signals when run as standalone process
if (require.main === module) {
  startWorker();

  const shutdown = async (signal) => {
    logger.info({ signal }, '[WORKER] Received shutdown signal');
    await stopWorker();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = {
  startWorker,
  stopWorker,
  processCodeExecution,
  processAiEvaluation,
  processResumeParsing,
};
