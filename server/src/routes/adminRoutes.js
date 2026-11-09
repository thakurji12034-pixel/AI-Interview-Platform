const express = require('express');
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/permission');
const adminController = require('../controllers/adminController');

const router = express.Router();

// All admin routes require valid authentication and the 'admin:access' permission
router.use(auth, requirePermission('admin:access'));

// User management
router.get('/users', adminController.listUsers);
router.patch('/users/:id/role', adminController.updateUserRole);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.post('/users/:id/revoke-sessions', adminController.revokeSessions);

// Invitations
router.post('/invitations', adminController.createInvitation);
router.get('/invitations', adminController.listInvitations);
router.delete('/invitations/:id', adminController.revokeInvitation);

// Audit logs
router.get('/audit-logs', adminController.listAuditLogs);

// Platform settings
router.get('/settings', adminController.getSettings);
router.put('/settings/:key', adminController.updateSetting);

module.exports = router;

