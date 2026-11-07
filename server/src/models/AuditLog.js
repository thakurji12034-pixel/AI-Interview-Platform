const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AuditLog = sequelize.define(
  'AuditLog',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    actorId: { type: DataTypes.INTEGER, allowNull: true },
    action: { type: DataTypes.STRING(100), allowNull: false },
    targetType: { type: DataTypes.STRING(50), allowNull: false },
    targetId: { type: DataTypes.STRING(50), allowNull: true },
    ipAddress: { type: DataTypes.STRING(45), allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { tableName: 'audit_logs', timestamps: false, updatedAt: false }
);

module.exports = AuditLog;
