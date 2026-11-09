const { GoogleGenAI } = require('@google/genai');
const AiProvider = require('./AiProvider');
const { logger } = require('../utils/logger');
const AppError = require('../utils/AppError');

class GeminiAdapter extends AiProvider {
  constructor(options = {}) {
    super();
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    this.modelName = options.modelName || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.timeoutMs = options.timeoutMs || 25000;

    if (!this.apiKey) {
      logger.warn('[GeminiAdapter] GEMINI_API_KEY is not configured. Real API calls will fail.');
    } else {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  getProviderName() {
    return 'gemini';
  }

  async generateStructuredJson({ prompt, purpose, promptVersion = 'v1.0', userId = null }) {
    if (!this.client) {
      throw new AppError('Gemini API is not configured with an API key', 503, 'AI_SERVICE_UNAVAILABLE');
    }

    const startTime = Date.now();
    try {
      // Execute with timeout race
      const apiCall = this.client.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new AppError('AI provider request timed out', 504, 'AI_TIMEOUT')), this.timeoutMs)
      );

      const response = await Promise.race([apiCall, timeoutPromise]);
      const latencyMs = Date.now() - startTime;

      let rawText = '';
      if (typeof response.text === 'string') {
        rawText = response.text;
      } else if (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) {
        rawText = response.candidates[0].content.parts[0].text;
      }

      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch (parseErr) {
        logger.error({ err: parseErr, rawText }, '[GeminiAdapter] Failed to parse JSON response from Gemini');
        throw new AppError('AI provider returned malformed JSON', 502, 'AI_MALFORMED_OUTPUT');
      }

      return {
        data: parsed,
        metadata: {
          model: this.modelName,
          promptVersion,
          purpose,
          userId,
          latencyMs,
          inputTokens: response.usageMetadata?.promptTokenCount || 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
        },
      };
    } catch (err) {
      logger.error({ err, purpose }, '[GeminiAdapter] Gemini API generation error');
      throw err instanceof AppError ? err : new AppError(`AI Generation failed: ${err.message}`, 502, 'AI_ERROR');
    }
  }
}

module.exports = GeminiAdapter;
