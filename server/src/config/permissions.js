/**
 * Role-Based Access Control (RBAC) Permission Matrix
 *
 * Defines explicit granular permissions for all platform roles:
 * - candidate: Default public role with access to own interviews and live rooms
 * - interviewer: Technical staff authorized to schedule sessions and conduct evaluations
 * - admin: System administrators with user management, invitations, audit logs, and settings
 */
const ROLE_PERMISSIONS = {
  candidate: [
    'interview:view_self',
    'interview:cancel_self',
    'coding_room:join',
    'profile:manage_self',
  ],
  interviewer: [
    'interview:view_self',
    'interview:cancel_self',
    'coding_room:join',
    'profile:manage_self',
    'interview:schedule',
    'interview:edit',
    'interview:start',
    'interview:complete',
    'candidate:view_roster',
    'feedback:submit',
  ],
  admin: [
    'interview:view_self',
    'interview:cancel_self',
    'coding_room:join',
    'profile:manage_self',
    'interview:schedule',
    'interview:edit',
    'interview:start',
    'interview:complete',
    'candidate:view_roster',
    'feedback:submit',
    'admin:access',
    'user:read_all',
    'user:manage_role',
    'user:manage_status',
    'user:revoke_sessions',
    'invitation:create',
    'invitation:read',
    'invitation:revoke',
    'audit_log:read',
    'settings:read',
    'settings:manage',
  ],
};

const hasPermission = (role, permission) => {
  if (!role || !ROLE_PERMISSIONS[role]) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
};

module.exports = {
  ROLE_PERMISSIONS,
  hasPermission,
};

