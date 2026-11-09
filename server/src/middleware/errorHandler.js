const { logger } = require('../utils/logger');
const config = require('../config/env');

module.exports = (err, req, res, _next) => {
  let statusCode = err.statusCode || err.status || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.errors.map((e) => e.message);
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    code = 'CONFLICT';
    message = 'Resource already exists';
    details = err.errors.map((e) => e.message);
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Invalid or expired token';
  }

  // Hide internal implementation details on 500 in production
  if (statusCode === 500 && config.env === 'production') {
    message = 'Internal server error';
    details = null;
  }

  logger.error(
    {
      err: {
        message: err.message,
        stack: config.env !== 'production' ? err.stack : undefined,
        code,
        statusCode,
      },
      reqId: req.id,
    },
    `Error handling request: ${err.message}`
  );

  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    message, // Preserved for backwards compatibility with existing client
  });
};
