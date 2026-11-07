const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');

const COOKIE_PATH = '/api/auth';
const COOKIE_PATH_V1 = '/api/v1/auth';

const cookieOptions = {
  httpOnly: true, // Prevent client-side script access to protect against XSS
  secure: config.env === 'production',
  sameSite: 'lax',
  path: COOKIE_PATH,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const signAccessToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiresIn,
    algorithm: config.jwt.algorithm,
  });

const signRefreshToken = (user) =>
  jwt.sign({ id: user.id }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
    algorithm: config.jwt.algorithm,
  });

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

/**
 * Issues fresh access and refresh token pair, persisting the hashed refresh token in the database.
 */
const issueTokens = async (user, res) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  user.refreshToken = hashToken(refreshToken);
  await user.save();

  // Set cookie for both legacy /api/auth and versioned /api/v1/auth path compatibility
  res.cookie('refreshToken', refreshToken, cookieOptions);
  res.cookie('refreshToken', refreshToken, { ...cookieOptions, path: COOKIE_PATH_V1 });
  return accessToken;
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    let role = req.body.role || 'candidate';

    // Public signup strictly defaults to candidate unless dev override is enabled in non-production
    if (role !== 'candidate' && (!config.allowDevInterviewerRegistration || config.env === 'production')) {
      role = 'candidate';
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: 'Email already registered' },
        message: 'Email already registered',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role });

    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    const ok = user && (await bcrypt.compare(password, user.passwordHash));

    // Identical error message prevents account enumeration
    if (!ok) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' },
        message: 'Invalid email or password',
      });
    }

    const accessToken = await issueTokens(user, res);
    res.json({ accessToken, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Refresh token missing' },
        message: 'Refresh token missing',
      });
    }

    let payload;
    try {
      payload = jwt.verify(token, config.jwt.refreshSecret, {
        algorithms: [config.jwt.algorithm],
      });
    } catch (_err) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' },
        message: 'Invalid or expired refresh token',
      });
    }

    const user = await User.findByPk(payload.id);
    if (!user || user.refreshToken !== hashToken(token)) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Refresh token is no longer valid' },
        message: 'Refresh token is no longer valid',
      });
    }

    // Refresh token rotation: consume old token and issue fresh pair
    const accessToken = await issueTokens(user, res);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;

    if (token) {
      try {
        const payload = jwt.verify(token, config.jwt.refreshSecret, {
          algorithms: [config.jwt.algorithm],
        });
        await User.update({ refreshToken: null }, { where: { id: payload.id } });
      } catch (_err) {
        // Token was already invalid; clearing cookies is sufficient
      }
    }

    res.clearCookie('refreshToken', { path: COOKIE_PATH });
    res.clearCookie('refreshToken', { path: COOKIE_PATH_V1 });
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'User not found' },
        message: 'User not found',
      });
    }
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};
