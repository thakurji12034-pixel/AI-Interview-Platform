const { hasPermission } = require('../config/permissions');

/**
 * Express middleware that checks whether the authenticated user's role possesses
 * the required permission according to the RBAC matrix.
 *
 * @param {string} permission - The permission token to check (e.g. 'admin:access')
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        message: 'Authentication required',
      });
    }

    if (req.user.isActive === false) {
      return res.status(403).json({
        error: {
          code: 'ACCOUNT_DEACTIVATED',
          message: 'Your account has been deactivated. Please contact an administrator.',
        },
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Forbidden: your role (${req.user.role}) lacks permission "${permission}"`,
        },
        message: `Forbidden: your role (${req.user.role}) lacks permission "${permission}"`,
      });
    }

    next();
  };
};

module.exports = requirePermission;

