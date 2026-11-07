const CodeExecutionProvider = require('./CodeExecutionProvider');
const { logger } = require('../../utils/logger');

const LANGUAGE_MAP = {
  javascript: 63, // JavaScript (Node.js 18.15.0)
  python: 71,     // Python (3.8.1)
  java: 62,       // Java (OpenJDK 13.0.1)
  cpp: 54,        // C++ (GCC 9.2.0)
};

class Judge0Adapter extends CodeExecutionProvider {
  constructor(endpoint, apiKey = '') {
    super();
    this.endpoint = endpoint ? endpoint.replace(/\/$/, '') : 'http://localhost:2358';
    this.apiKey = apiKey;
  }

  async execute({ language, sourceCode, stdin = '', expectedOutput = null, cpuTimeLimit = 2, memoryLimit = 128000 }) {
    const languageId = LANGUAGE_MAP[language.toLowerCase()];
    if (!languageId) {
      throw new Error(`Unsupported execution language: ${language}`);
    }

    const payload = {
      source_code: sourceCode,
      language_id: languageId,
      stdin,
      expected_output: expectedOutput,
      cpu_time_limit: cpuTimeLimit,
      memory_limit: memoryLimit,
      enable_network: false, // Security: Disable network access inside sandbox
    };

    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['X-Auth-Token'] = this.apiKey;
    }

    try {
      const response = await fetch(`${this.endpoint}/submissions?base64_encoded=false&wait=true`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Judge0 API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this._normalizeResponse(data);
    } catch (err) {
      logger.error({ error: err.message }, '[JUDGE0] Execution failed');
      return {
        status: 'internal_error',
        stdout: null,
        stderr: err.message,
        compileOutput: null,
        executionTimeMs: 0,
        memoryKb: 0,
      };
    }
  }

  _normalizeResponse(data) {
    const statusId = data.status ? data.status.id : 13;
    let normalizedStatus;

    switch (statusId) {
      case 3:
        normalizedStatus = 'accepted';
        break;
      case 4:
        normalizedStatus = 'wrong_answer';
        break;
      case 5:
        normalizedStatus = 'time_limit_exceeded';
        break;
      case 6:
        normalizedStatus = 'compilation_error';
        break;
      case 7:
      case 8:
      case 9:
      case 10:
      case 11:
      case 12:
        normalizedStatus = 'runtime_error';
        break;
      default:
        normalizedStatus = 'internal_error';
    }

    const truncate = (str, max = 10000) => (str && str.length > max ? `${str.slice(0, max)}... [truncated]` : str || null);

    return {
      status: normalizedStatus,
      rawStatusDescription: data.status ? data.status.description : null,
      stdout: truncate(data.stdout),
      stderr: truncate(data.stderr),
      compileOutput: truncate(data.compile_output),
      executionTimeMs: data.time ? Math.round(parseFloat(data.time) * 1000) : null,
      memoryKb: data.memory || null,
    };
  }
}

module.exports = {
  Judge0Adapter,
  LANGUAGE_MAP,
};

