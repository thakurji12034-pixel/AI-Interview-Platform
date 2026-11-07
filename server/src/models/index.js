const User = require('./User');
const Interview = require('./Interview');
const Invitation = require('./Invitation');
const RefreshToken = require('./RefreshToken');
const AuditLog = require('./AuditLog');
const PlatformSetting = require('./PlatformSetting');

User.hasMany(Interview, { as: 'interviewsGiven', foreignKey: 'interviewerId' });
User.hasMany(Interview, { as: 'interviewsTaken', foreignKey: 'candidateId' });
Interview.belongsTo(User, { as: 'interviewer', foreignKey: 'interviewerId' });
Interview.belongsTo(User, { as: 'candidate', foreignKey: 'candidateId' });

User.hasMany(Invitation, { as: 'invitationsSent', foreignKey: 'invitedById' });
Invitation.belongsTo(User, { as: 'invitedBy', foreignKey: 'invitedById' });

User.hasMany(RefreshToken, { as: 'refreshTokens', foreignKey: 'userId', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { as: 'user', foreignKey: 'userId' });

User.hasMany(AuditLog, { as: 'auditLogs', foreignKey: 'actorId' });
AuditLog.belongsTo(User, { as: 'actor', foreignKey: 'actorId' });

PlatformSetting.belongsTo(User, { as: 'updatedBy', foreignKey: 'updatedById' });

module.exports = {
  User,
  Interview,
  Invitation,
  RefreshToken,
  AuditLog,
  PlatformSetting,
};