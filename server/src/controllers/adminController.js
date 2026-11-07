const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, Invitation, AuditLog, PlatformSetting } = require('../models');
const { revokeUserSessions, hashToken } = require('../services/authService');
const { logAudit } = require('../services/auditService');
const AppError = require('../utils/AppError');

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive !== false,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

exports.listUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.role) {
      where.role = req.query.role;
    }
    if (req.query.isActive !== undefined) {
      where.isActive = req.query.isActive === 'true' || req.query.isActive === true;
    }
    if (req.query.search) {
      const term = `%${req.query.search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.like]: term } },
        { email: { [Op.like]: term } },
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'name', 'email', 'role', 'isActive', 'createdAt', 'updatedAt'],
    });

    res.json({
      users: rows.map(publicUser),
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const { role } = req.body;

    if (!['candidate', 'interviewer', 'admin'].includes(role)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid role');
    }

    if (req.user.id === targetUserId && role !== 'admin') {
      throw new AppError(400, 'CANNOT_DEMOTE_SELF', 'Administrators cannot demote themselves.');
    }

    const user = await User.findByPk(targetUserId);
    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    await logAudit({
      actorId: req.user.id,
      action: 'USER_ROLE_CHANGED',
      targetType: 'User',
      targetId: String(user.id),
      ipAddress: req.ip || null,
      metadata: { fromRole: oldRole, toRole: role },
    });

    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      throw new AppError(400, 'VALIDATION_ERROR', 'isActive must be a boolean');
    }

    if (req.user.id === targetUserId && !isActive) {
      throw new AppError(400, 'CANNOT_DEACTIVATE_SELF', 'Administrators cannot deactivate themselves.');
    }

    const user = await User.findByPk(targetUserId);
    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    user.isActive = isActive;
    await user.save();

    if (!isActive) {
      // Automatically revoke all sessions if user is deactivated
      await revokeUserSessions(user.id, req.user.id, req.ip || null);
    }

    await logAudit({
      actorId: req.user.id,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      targetType: 'User',
      targetId: String(user.id),
      ipAddress: req.ip || null,
    });

    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

exports.revokeSessions = async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const user = await User.findByPk(targetUserId);
    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    await revokeUserSessions(user.id, req.user.id, req.ip || null);
    res.json({ message: 'User sessions successfully revoked' });
  } catch (err) {
    next(err);
  }
};

exports.createInvitation = async (req, res, next) => {
  try {
    const { email, role } = req.body;

    if (!email || !role || !['interviewer', 'admin'].includes(role)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Valid email and role (interviewer or admin) are required');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user is already registered
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      throw new AppError(409, 'CONFLICT', 'A user with this email is already registered.');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours validity

    const invitation = await Invitation.create({
      email: normalizedEmail,
      role,
      tokenHash,
      expiresAt,
      invitedById: req.user.id,
    });

    await logAudit({
      actorId: req.user.id,
      action: 'INVITATION_CREATED',
      targetType: 'Invitation',
      targetId: String(invitation.id),
      ipAddress: req.ip || null,
      metadata: { email: normalizedEmail, role },
    });

    const origin = req.get('origin') || 'http://localhost:5173';
    const inviteUrl = `${origin}/accept-invite?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;

    res.status(201).json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      },
      inviteToken: rawToken,
      inviteUrl,
    });
  } catch (err) {
    next(err);
  }
};

exports.listInvitations = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.status === 'used') {
      where.usedAt = { [Op.ne]: null };
    } else if (req.query.status === 'revoked') {
      where.revokedAt = { [Op.ne]: null };
    } else if (req.query.status === 'expired') {
      where.expiresAt = { [Op.lt]: new Date() };
      where.usedAt = null;
      where.revokedAt = null;
    } else if (req.query.status === 'active') {
      where.expiresAt = { [Op.gt]: new Date() };
      where.usedAt = null;
      where.revokedAt = null;
    }

    const { count, rows } = await Invitation.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'email', 'role', 'expiresAt', 'revokedAt', 'usedAt', 'invitedById', 'createdAt'],
      include: [{ model: User, as: 'invitedBy', attributes: ['id', 'name', 'email'] }],
    });

    res.json({
      invitations: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.revokeInvitation = async (req, res, next) => {
  try {
    const inviteId = parseInt(req.params.id, 10);
    const invitation = await Invitation.findByPk(inviteId);

    if (!invitation) {
      throw new AppError(404, 'NOT_FOUND', 'Invitation not found');
    }

    if (invitation.usedAt) {
      throw new AppError(400, 'CANNOT_REVOKE_USED', 'Cannot revoke an invitation that has already been redeemed.');
    }

    invitation.revokedAt = new Date();
    await invitation.save();

    await logAudit({
      actorId: req.user.id,
      action: 'INVITATION_REVOKED',
      targetType: 'Invitation',
      targetId: String(invitation.id),
      ipAddress: req.ip || null,
      metadata: { email: invitation.email },
    });

    res.json({ message: 'Invitation successfully revoked' });
  } catch (err) {
    next(err);
  }
};

exports.listAuditLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.action) {
      where.action = req.query.action;
    }
    if (req.query.targetType) {
      where.targetType = req.query.targetType;
    }
    if (req.query.actorId) {
      where.actorId = parseInt(req.query.actorId, 10);
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'email', 'role'] }],
    });

    res.json({
      auditLogs: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getSettings = async (req, res, next) => {
  try {
    const settings = await PlatformSetting.findAll({
      order: [['key', 'ASC']],
    });
    const map = {};
    settings.forEach((s) => {
      map[s.key] = s.value;
    });
    res.json({ settings: map, raw: settings });
  } catch (err) {
    next(err);
  }
};

exports.updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    if (value === undefined) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Setting value is required');
    }

    const [setting] = await PlatformSetting.upsert({
      key,
      value,
      description: description || null,
      updatedById: req.user.id,
    });

    await logAudit({
      actorId: req.user.id,
      action: 'PLATFORM_SETTING_UPDATED',
      targetType: 'PlatformSetting',
      targetId: key,
      ipAddress: req.ip || null,
      metadata: { key },
    });

    res.json({ setting });
  } catch (err) {
    next(err);
  }
};

