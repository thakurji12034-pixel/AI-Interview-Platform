const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PlatformSetting = sequelize.define(
  'PlatformSetting',
  {
    key: { type: DataTypes.STRING(100), primaryKey: true, allowNull: false },
    value: { type: DataTypes.JSON, allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    updatedById: { type: DataTypes.INTEGER, allowNull: true },
  },
  { tableName: 'platform_settings', timestamps: true }
);

module.exports = PlatformSetting;
