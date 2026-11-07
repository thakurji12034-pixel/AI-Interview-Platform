const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class AiUsage extends Model {}

AiUsage.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    purpose: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    promptVersion: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    inputTokens: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    outputTokens: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    latencyMs: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('success', 'failed', 'fallback'),
      allowNull: false,
      defaultValue: 'success',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'AiUsage',
    tableName: 'ai_usage',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['purpose'] },
      { fields: ['createdAt'] },
    ],
  }
);

module.exports = AiUsage;
