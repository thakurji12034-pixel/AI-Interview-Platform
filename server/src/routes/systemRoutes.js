const express = require('express');
const auth = require('../middleware/auth');
const config = require('../config/env');
const { getRedisClient } = require('../config/redis');

const router = express.Router();

router.use(auth);

/**
 * GET /api/v1/system/capabilities
 * Returns active underlying execution providers (no secrets)
 */
router.get('/capabilities', (_req, res) => {
  const client = getRedisClient();
  const isInMemoryRedis = Boolean(client.isMock || config.redis.mock);

  res.json({
    aiProvider: config.ai.mockMode ? 'mock' : 'gemini',
    executionProvider: config.execution.provider === 'judge0' ? 'judge0' : 'mock',
    redis: isInMemoryRedis ? 'in-memory' : 'redis',
  });
});

module.exports = router;
