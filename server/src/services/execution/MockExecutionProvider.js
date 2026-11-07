const CodeExecutionProvider = require('./CodeExecutionProvider');

class MockExecutionProvider extends CodeExecutionProvider {
  async execute({ language: _language, sourceCode, stdin: _stdin = '', expectedOutput = null, cpuTimeLimit = 2 }) {
    // 1. Simulate compilation/syntax error
    if (sourceCode.includes('SYNTAX_ERROR') || sourceCode.includes('compile_error')) {
      return {
        status: 'compilation_error',
        stdout: null,
        stderr: 'SyntaxError: Unexpected token or invalid syntax',
        compileOutput: 'error: expected ";" before "}" token',
        executionTimeMs: 12,
        memoryKb: 1024,
      };
    }

    // 2. Simulate time limit exceeded
    if (sourceCode.includes('INFINITE_LOOP') || sourceCode.includes('timeout') || sourceCode.includes('while(true)')) {
      return {
        status: 'time_limit_exceeded',
        stdout: null,
        stderr: `Time Limit Exceeded: Execution terminated after exceeding ${cpuTimeLimit}s`,
        compileOutput: null,
        executionTimeMs: cpuTimeLimit * 1000 + 10,
        memoryKb: 32000,
      };
    }

    // 3. Simulate runtime error / exception
    if (sourceCode.includes('RUNTIME_ERROR') || sourceCode.includes('throw new Error') || sourceCode.includes('NullPointerException')) {
      return {
        status: 'runtime_error',
        stdout: null,
        stderr: 'Exception in thread "main" java.lang.NullPointerException or Uncaught Error',
        compileOutput: null,
        executionTimeMs: 45,
        memoryKb: 16000,
      };
    }

    // 4. Simulate forced wrong answer
    if (sourceCode.includes('WRONG_ANSWER')) {
      return {
        status: 'wrong_answer',
        stdout: 'incorrect_output_val',
        stderr: null,
        compileOutput: null,
        executionTimeMs: 50,
        memoryKb: 8192,
      };
    }

    // 5. Default: Valid execution with matching output
    const cleanOutput = expectedOutput !== null && expectedOutput !== undefined ? String(expectedOutput).trim() : 'success';
    return {
      status: 'accepted',
      stdout: cleanOutput,
      stderr: null,
      compileOutput: null,
      executionTimeMs: Math.floor(Math.random() * 40) + 15, // realistic 15-55ms
      memoryKb: Math.floor(Math.random() * 2000) + 4000,     // realistic 4-6MB
    };
  }
}

module.exports = MockExecutionProvider;

