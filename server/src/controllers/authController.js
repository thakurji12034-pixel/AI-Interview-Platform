const bcrypt = require('bcryptjs');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const config = require('../config/env');
const {
  issueTokenFamily,
  rotateRefreshToken,
  redeemInvitation,
  hashToken,
} = require('../services/authService');
const { logAudit } = require('../services/auditService');

const COOKIE_PATH = '/api/auth';
const COOKIE_PATH_V1 = '/api/v1/auth';

const cookieOptions = {
  httpOnly: true, // Prevent client-side script access to protect against XSS
  secure: config.env === 'production',
  sameSite: 'lax',
  path: COOKIE_PATH,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const setAuthCookies = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, cookieOptions);
  res.cookie('refreshToken', refreshToken, { ...cookieOptions, path: COOKIE_PATH_V1 });
};

const clearAuthCookies = (res) => {
  res.clearCookie('refreshToken', { path: COOKIE_PATH });
  res.clearCookie('refreshToken', { path: COOKIE_PATH_V1 });
};

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive !== false,
});

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, inviteToken } = req.body;
    let role = req.body.role || 'candidate';
    let invitation = null;

    if (inviteToken) {
      invitation = await redeemInvitation(inviteToken, email);
      role = invitation.role;
    } else if (
      role !== 'candidate' &&
      (!config.allowDevInterviewerRegistration || config.env === 'production')
    ) {
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
    const user = await User.create({ name, email, passwordHash, role, isActive: true });

    if (invitation) {
      invitation.usedAt = new Date();
      await invitation.save();

      await logAudit({
        actorId: user.id,
        action: 'INVITATION_REDEEMED',
        targetType: 'Invitation',
        targetId: String(invitation.id),
        ipAddress: req.ip || null,
        metadata: { role, email },
      });
    }

    const { accessToken, refreshToken } = await issueTokenFamily(user, req);
    setAuthCookies(res, refreshToken);

    await logAudit({
      actorId: user.id,
      action: 'USER_REGISTERED',
      targetType: 'User',
      targetId: String(user.id),
      ipAddress: req.ip || null,
      metadata: { role },
    });

    res.status(201).json({ user: publicUser(user), accessToken });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    const ok = user && (await bcrypt.compare(password, user.passwordHash));

    if (!ok) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' },
        message: 'Invalid email or password',
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        error: {
          code: 'ACCOUNT_DEACTIVATED',
          message: 'Your account has been deactivated. Please contact an administrator.',
        },
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
    }

    const { accessToken, refreshToken } = await issueTokenFamily(user, req);
    setAuthCookies(res, refreshToken);

    await logAudit({
      actorId: user.id,
      action: 'USER_LOGIN',
      targetType: 'User',
      targetId: String(user.id),
      ipAddress: req.ip || null,
    });

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

    const { accessToken, refreshToken } = await rotateRefreshToken(token, req);
    setAuthCookies(res, refreshToken);

    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;

    if (token) {
      const tokenHash = hashToken(token);
      await RefreshToken.update(
        { revokedAt: new Date() },
        { where: { tokenHash, revokedAt: null } }
      );
      await User.update({ refreshToken: null }, { where: { refreshToken: tokenHash } });
    }

    clearAuthCookies(res);
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
