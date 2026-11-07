const jwt = require('jsonwebtoken');
const config = require('../config/env');

module.exports = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Access token missing' },
      message: 'Access token missing',
    });
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret, {
      algorithms: [config.jwt.algorithm],
    });
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (_err) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      message: 'Invalid or expired token',
    });
  }
};
