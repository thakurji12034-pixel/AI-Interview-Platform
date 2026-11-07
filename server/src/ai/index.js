const crypto = require('crypto');
const GeminiAdapter = require('./GeminiAdapter');
const MockAiProvider = require('./MockAiProvider');
const { AiUsage } = require('../models');
const cacheService = require('../services/cacheService');
const { logger } = require('../utils/logger');
const AppError = require('../utils/AppError');

class AiManager {
  constructor() {
    this.mockMode = process.env.AI_MOCK_MODE === 'true' || !process.env.GEMINI_API_KEY;
    this.geminiAdapter = new GeminiAdapter();
    this.mockAdapter = new MockAiProvider();

    // Circuit breaker state
    this.failureCount = 0;
    this.circuitOpen = false;
    this.circuitResetTime = 0;
    this.FAILURE_THRESHOLD = 5;
    this.RESET_TIMEOUT_MS = 30000;
  }

  getProvider() {
    if (this.mockMode) {
      return this.mockAdapter;
    }

    // Check circuit breaker status
    if (this.circuitOpen) {
      if (Date.now() > this.circuitResetTime) {
        logger.info('[AiManager] Circuit breaker resetting to half-open');
        this.circuitOpen = false;
        this.failureCount = 0;
      } else {
        logger.warn('[AiManager] Circuit breaker OPEN; falling back to MockAiProvider');
        return this.mockAdapter;
      }
    }

    return this.geminiAdapter;
  }

  /**
   * Executes AI request with caching, usage tracking, circuit breaking, and mock fallback
   */
  async execute({ prompt, purpose, promptVersion = 'v1.0', userId = null, bypassCache = false }) {
    if (!prompt || typeof prompt !== 'string') {
      throw new AppError('Prompt string is required', 400, 'INVALID_PROMPT');
    }

    // 1. Generate deterministic cache key
    const cacheKey = `ai:${purpose}:${crypto.createHash('sha256').update(prompt).digest('hex')}`;

    if (!bypassCache) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.debug({ purpose, cacheKey }, '[AiManager] Returning cached AI response');
        return cached;
      }
    }

    const provider = this.getProvider();
    const startTime = Date.now();
    let resultData = null;
    let status = 'success';
    let errorMessage = null;
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const rawResult = await provider.generateStructuredJson({
        prompt,
        purpose,
        promptVersion,
        userId,
      });

      // Provider might return { data, metadata } or direct JSON object
      resultData = rawResult.data || rawResult;
      if (rawResult.metadata) {
        inputTokens = rawResult.metadata.inputTokens || 0;
        outputTokens = rawResult.metadata.outputTokens || 0;
      }

      // Successful call resets failure count
      if (!this.mockMode) {
        this.failureCount = 0;
      }

      // Cache successful response for 10 minutes
      if (!bypassCache && resultData) {
        await cacheService.set(cacheKey, resultData, 600);
      }
    } catch (err) {
      status = 'failed';
      errorMessage = err.message;
      this.failureCount++;

      if (this.failureCount >= this.FAILURE_THRESHOLD) {
        this.circuitOpen = true;
        this.circuitResetTime = Date.now() + this.RESET_TIMEOUT_MS;
        logger.error({ failureCount: this.failureCount }, '[AiManager] Circuit breaker TRIPPED to OPEN');
      }

      // If real provider failed and fallback is possible, use mock adapter
      if (!this.mockMode) {
        logger.warn('[AiManager] Attempting fallback to MockAiProvider after failure');
        try {
          resultData = await this.mockAdapter.generateStructuredJson({
            prompt,
            purpose,
            promptVersion,
            userId,
          });
          status = 'fallback';
        } catch (mockErr) {
          logger.error({ mockErr }, '[AiManager] Fallback mock also failed');
        }
      }

      if (!resultData) {
        throw err;
      }
    } finally {
      const latencyMs = Date.now() - startTime;
      try {
        await AiUsage.create({
          userId,
          purpose,
          promptVersion,
          model: provider.modelName || 'mock-gemini-2.5-flash',
          inputTokens,
          outputTokens,
          latencyMs,
          status,
          errorMessage,
        });
      } catch (logErr) {
        logger.error({ logErr }, '[AiManager] Failed to log AI usage to database');
      }
    }

    return resultData;
  }
}

const aiManager = new AiManager();

module.exports = {
  AiManager,
  aiManager,
};
