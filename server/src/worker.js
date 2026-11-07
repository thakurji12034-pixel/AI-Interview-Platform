const { Worker } = require('bullmq');
const { getRedisClient, createClientOptions } = require('./config/redis');
const { QUEUE_NAMES, MockQueue } = require('./jobs/queueManager');
const { getExecutionProvider } = require('./services/execution');
const { Submission, TestCase } = require('./models');
const { logger } = require('./utils/logger');
const config = require('./config/env');

const activeWorkers = [];

/**
 * Job Processors (Modular handlers prepared for Phase 5, 6, 7 integration)
 */
async function processCodeExecution(job) {
  const { submissionId } = job.data;
  logger.info({ jobId: job.id, submissionId }, '[WORKER] Processing code execution job');
  await job.updateProgress(10);

  const submission = await Submission.findByPk(submissionId);
  if (!submission) {
    logger.warn({ submissionId }, '[WORKER] Submission not found');
    return { status: 'failed', error: 'Submission not found' };
  }

  await submission.update({ status: 'processing' });
  await job.updateProgress(25);

  const testCases = await TestCase.findAll({
    where: { questionId: submission.questionId },
    order: [['id', 'ASC']],
  });

  const provider = getExecutionProvider();
  const testResults = [];
  let passedCount = 0;
  let overallResult = 'accepted';
  let totalTimeMs = 0;
  let maxMemoryKb = 0;
  let sampleStdout = '';
  let sampleStderr = '';
  let sampleCompileOutput = '';

  const casesToRun =
    testCases.length > 0
      ? testCases
      : [{ id: 0, input: '', expectedOutput: null, isHidden: false, weight: 1 }];

  const totalCases = casesToRun.length;

  for (let i = 0; i < totalCases; i++) {
    const tc = casesToRun[i];
    const execRes = await provider.execute({
      language: submission.language,
      sourceCode: submission.code,
      stdin: tc.input || '',
      expectedOutput: tc.expectedOutput || null,
      cpuTimeLimit: tc.timeLimitMs ? tc.timeLimitMs / 1000 : 2,
      memoryLimit: tc.memoryLimitKb || 128000,
    });

    if (execRes.executionTimeMs) totalTimeMs += execRes.executionTimeMs;
    if (execRes.memoryKb && execRes.memoryKb > maxMemoryKb) maxMemoryKb = execRes.memoryKb;
    if (execRes.stdout && !sampleStdout) sampleStdout = execRes.stdout;
    if (execRes.stderr && !sampleStderr) sampleStderr = execRes.stderr;
    if (execRes.compileOutput && !sampleCompileOutput) sampleCompileOutput = execRes.compileOutput;

    let isPassed = execRes.status === 'accepted';
    if (tc.expectedOutput !== null && tc.expectedOutput !== undefined) {
      const actualOut = (execRes.stdout || '').trim();
      const expectedOut = String(tc.expectedOutput).trim();
      if (actualOut !== expectedOut && isPassed) {
        isPassed = false;
        execRes.status = 'wrong_answer';
      }
    }

    if (isPassed) {
      passedCount++;
    } else if (overallResult === 'accepted') {
      overallResult = execRes.status;
    }

    testResults.push({
      index: i + 1,
      testCaseId: tc.id || null,
      isHidden: Boolean(tc.isHidden),
      status: execRes.status,
      input: tc.input || '',
      expectedOutput: tc.expectedOutput || '',
      stdout: execRes.stdout || null,
      executionTimeMs: execRes.executionTimeMs || 0,
    });

    const progress = Math.min(95, Math.round(25 + ((i + 1) / totalCases) * 70));
    await job.updateProgress(progress);
  }

  await submission.update({
    status: 'completed',
    resultStatus: overallResult,
    passedTests: passedCount,
    totalTests: totalCases,
    executionTimeMs: totalTimeMs,
    memoryKb: maxMemoryKb,
    stdout: sampleStdout || null,
    stderr: sampleStderr || null,
    compileOutput: sampleCompileOutput || null,
    testResults,
  });

  await job.updateProgress(100);

  return {
    status: 'completed',
    submissionId: submission.id,
    resultStatus: overallResult,
    passedTests: passedCount,
    totalTests: totalCases,
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
