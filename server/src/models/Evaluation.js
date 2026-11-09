const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Evaluation extends Model {}

Evaluation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    answerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    technicalCorrectness: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    relevance: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    explanationQuality: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    problemSolving: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    communicationClarity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    overallScore: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    dimensionWeights: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    strengths: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    weaknesses: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    generatedBy: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'ai',
    },
    model: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    promptVersion: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    disclaimer: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'evaluating', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Evaluation',
    tableName: 'evaluations',
    timestamps: true,
    indexes: [
      { fields: ['sessionId'] },
      { fields: ['answerId'] },
      { fields: ['status'] },
    ],
  }
);

module.exports = Evaluation;
