const { AuditLog } = require('../models');
const { logger } = require('../utils/logger');

/**
 * Asynchronously records an immutable audit log entry.
 *
 * @param {Object} params
 * @param {number|null} [params.actorId] - User ID who performed the action
 * @param {string} params.action - Semantic action (e.g. 'USER_LOGIN', 'USER_ROLE_CHANGED')
 * @param {string} params.targetType - Domain entity type (e.g. 'User', 'Invitation', 'Setting')
 * @param {string} [params.targetId] - Identifier of target entity
 * @param {string} [params.ipAddress] - Request IP address
 * @param {Object} [params.metadata] - Additional contextual details (passwords/tokens must be redacted)
 */
const logAudit = async ({
  actorId = null,
  action,
  targetType,
  targetId = null,
  ipAddress = null,
  metadata = null,
}) => {
  try {
    await AuditLog.create({
      actorId,
      action,
      targetType,
      targetId: targetId ? String(targetId) : null,
      ipAddress,
      metadata,
    });
  } catch (err) {
    // Non-blocking: operational flow must not break if audit log write fails
    logger.error(`Failed to record audit log [${action}]: ${err.message}`);
  }
};

module.exports = { logAudit };

