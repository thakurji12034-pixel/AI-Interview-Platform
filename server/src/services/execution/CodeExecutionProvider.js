/**
 * Abstract interface for code execution providers (e.g. Judge0, Mock).
 */
class CodeExecutionProvider {
  /**
   * Execute source code against input
   * @param {object} params
   * @param {string} params.language - 'javascript' | 'python' | 'java' | 'cpp'
   * @param {string} params.sourceCode - Code content
   * @param {string} params.stdin - Standard input
   * @param {string} [params.expectedOutput] - Optional expected output
   * @param {number} [params.cpuTimeLimit] - Max CPU seconds
   * @param {number} [params.memoryLimit] - Max memory KB
   * @returns {Promise<object>} normalized execution result
   */
  async execute(_params) {
    throw new Error('Method execute() must be implemented by subclass');
  }
}

module.exports = CodeExecutionProvider;
