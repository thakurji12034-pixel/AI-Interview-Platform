const crypto = require('crypto');
const pino = require('pino');
const pinoHttp = require('pino-http');
const config = require('../config/env');

const isTest = config.env === 'test';

const logger = pino({
  level: isTest ? 'silent' : config.env === 'production' ? 'info' : 'debug',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.refreshToken',
      'res.headers["set-cookie"]',
    ],
    remove: true,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} completed with status ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} failed with error: ${err.message}`,
});

module.exports = { logger, httpLogger };

