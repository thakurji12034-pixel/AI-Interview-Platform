const config = require('../../config/env');
const { Judge0Adapter, LANGUAGE_MAP } = require('./Judge0Adapter');
const MockExecutionProvider = require('./MockExecutionProvider');

const EXECUTION_LIMITS = {
  maxSourceLength: 50000,   // Max 50,000 characters (consistent with live room limit)
  defaultCpuTimeLimit: 2,   // 2 seconds CPU
  maxCpuTimeLimit: 5,       // Max 5 seconds CPU
  defaultMemoryLimit: 128000, // 128 MB
  maxMemoryLimit: 256000,     // 256 MB
  maxStdoutLength: 10000,
};

let cachedProvider = null;

function getExecutionProvider() {
  if (cachedProvider) return cachedProvider;

  if (config.execution.provider === 'judge0') {
    cachedProvider = new Judge0Adapter(config.execution.judge0Endpoint, config.execution.judge0ApiKey);
  } else {
    cachedProvider = new MockExecutionProvider();
  }

  return cachedProvider;
}

module.exports = {
  getExecutionProvider,
  Judge0Adapter,
  MockExecutionProvider,
  LANGUAGE_MAP,
  EXECUTION_LIMITS,
};
