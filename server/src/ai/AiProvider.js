/**
 * Abstract interface for AI providers in IntelliPrep AI
 */
class AiProvider {
  /**
   * Generates structured JSON from a versioned prompt
   * @param {Object} options
   * @param {string} options.prompt - Full prompt text
   * @param {string} options.purpose - Operation purpose
   * @param {string} options.promptVersion - Version identifier of prompt template
   * @param {number} [options.userId] - Requesting user ID for usage logging
   * @param {number} [options.timeoutMs=15000] - Request timeout in ms
   * @returns {Promise<Object>} Parsed JSON response
   */
  async generateStructuredJson(_options) {
    throw new Error('generateStructuredJson() must be implemented by subclass');
  }

  getProviderName() {
    throw new Error('getProviderName() must be implemented by subclass');
  }
}

module.exports = AiProvider;
