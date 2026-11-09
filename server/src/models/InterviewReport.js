const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class InterviewReport extends Model {}

InterviewReport.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    candidateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    aiEvaluationScore: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    codeExecutionSummary: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    verifiedTimings: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    humanOverride: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    overallRecommendations: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    pdfReportPath: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    disclaimer: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'InterviewReport',
    tableName: 'interview_reports',
    timestamps: true,
    indexes: [
      { fields: ['sessionId'], unique: true },
      { fields: ['candidateId'] },
    ],
  }
);

module.exports = InterviewReport;
