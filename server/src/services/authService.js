const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User, RefreshToken, Invitation } = require('../models');
const config = require('../config/env');
const AppError = require('../utils/AppError');
const { logAudit } = require('./auditService');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const signAccessToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      role: user.role,
      isActive: user.isActive !== false,
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.accessExpiresIn,
      algorithm: config.jwt.algorithm,
    }
  );

const signRefreshToken = (user, familyId) =>
  jwt.sign(
    {
      id: user.id,
      familyId,
      jti: crypto.randomUUID(),
    },
    config.jwt.refreshSecret,
    {
      expiresIn: config.jwt.refreshExpiresIn,
      algorithm: config.jwt.algorithm,
    }
  );

/**
 * Issues fresh access and refresh token pair, tracking token family for reuse detection.
 */
const issueTokenFamily = async (user, req, existingFamilyId = null) => {
  const familyId = existingFamilyId || crypto.randomUUID();
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, familyId);
  const tokenHash = hashToken(refreshToken);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const userAgent = req.headers ? req.headers['user-agent'] : null;
  const ipAddress = req.ip || (req.connection && req.connection.remoteAddress) || null;

  await RefreshToken.create({
    userId: user.id,
    tokenHash,
    familyId,
    userAgent: userAgent ? userAgent.substring(0, 255) : null,
    ipAddress,
    expiresAt,
  });

  // Legacy fallback support
  user.refreshToken = tokenHash;
  await user.save();

  return { accessToken, refreshToken, familyId };
};

/**
 * Rotates refresh token within family, detecting reuse and revoking family on replay.
 */
const rotateRefreshToken = async (token, req) => {
  if (!token) {
    throw new AppError(401, 'UNAUTHORIZED', 'Refresh token missing');
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwt.refreshSecret, {
      algorithms: [config.jwt.algorithm],
    });
  } catch (_err) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
  }

  const tokenHash = hashToken(token);
  const tokenRecord = await RefreshToken.findOne({ where: { tokenHash } });

  // Fallback for legacy tokens before token families migration
  if (!tokenRecord) {
    const user = await User.findByPk(payload.id);
    if (!user || user.refreshToken !== tokenHash) {
      throw new AppError(401, 'UNAUTHORIZED', 'Refresh token is no longer valid');
    }
    if (!user.isActive) {
      throw new AppError(403, 'ACCOUNT_DEACTIVATED', 'Account deactivated');
    }

    const { accessToken, refreshToken } = await issueTokenFamily(user, req);
    return { accessToken, refreshToken, user };
  }

  // Token reuse detection: if token is already revoked, an attacker or compromised client is replaying it!
  if (tokenRecord.revokedAt !== null) {
    // Revoke the entire token family immediately
    await RefreshToken.update(
      { revokedAt: new Date() },
      { where: { familyId: tokenRecord.familyId, revokedAt: null } }
    );

    await logAudit({
      actorId: tokenRecord.userId,
      action: 'REFRESH_TOKEN_REUSE_DETECTED',
      targetType: 'RefreshToken',
      targetId: String(tokenRecord.id),
      ipAddress: req.ip || null,
      metadata: { familyId: tokenRecord.familyId, alert: 'Potential token replay attack' },
    });

    throw new AppError(
      401,
      'TOKEN_REUSE_DETECTED',
      'Refresh token has already been consumed. All sessions in this family have been revoked.'
    );
  }

  if (new Date() > new Date(tokenRecord.expiresAt)) {
    throw new AppError(401, 'UNAUTHORIZED', 'Refresh token has expired');
  }

  const user = await User.findByPk(tokenRecord.userId);
  if (!user || !user.isActive) {
    throw new AppError(403, 'ACCOUNT_DEACTIVATED', 'Account deactivated');
  }

  // Mark consumed token as revoked and issue fresh token in same family
  const { accessToken, refreshToken } = await issueTokenFamily(user, req, tokenRecord.familyId);
  tokenRecord.revokedAt = new Date();
  tokenRecord.replacedBy = hashToken(refreshToken);
  await tokenRecord.save();

  await logAudit({
    actorId: user.id,
    action: 'TOKEN_ROTATED',
    targetType: 'User',
    targetId: String(user.id),
    ipAddress: req.ip || null,
    metadata: { familyId: tokenRecord.familyId },
  });

  return { accessToken, refreshToken, user };
};

/**
 * Revokes all refresh tokens and sessions for a user.
 */
const revokeUserSessions = async (userId, actorId = null, ipAddress = null) => {
  await RefreshToken.update(
    { revokedAt: new Date() },
    { where: { userId, revokedAt: null } }
  );

  await User.update({ refreshToken: null }, { where: { id: userId } });

  await logAudit({
    actorId,
    action: 'USER_SESSIONS_REVOKED',
    targetType: 'User',
    targetId: String(userId),
    ipAddress,
  });
};

/**
 * Validates and redeems a single-use invitation token.
 */
const redeemInvitation = async (inviteToken, email) => {
  if (!inviteToken) return null;

  const tokenHash = hashToken(inviteToken);
  const invitation = await Invitation.findOne({
    where: {
      tokenHash,
      email: email.toLowerCase(),
      revokedAt: null,
      usedAt: null,
    },
  });

  if (!invitation) {
    throw new AppError(
      400,
      'INVALID_INVITATION',
      'Invitation token is invalid, expired, revoked, or already consumed.'
    );
  }

  if (new Date() > new Date(invitation.expiresAt)) {
    throw new AppError(400, 'EXPIRED_INVITATION', 'Invitation has expired.');
  }

  return invitation;
};

module.exports = {
  hashToken,
  signAccessToken,
  signRefreshToken,
  issueTokenFamily,
  rotateRefreshToken,
  revokeUserSessions,
  redeemInvitation,
};

