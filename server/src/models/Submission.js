const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Submission extends Model {}

Submission.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    questionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    assessmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    language: {
      type: DataTypes.ENUM('javascript', 'python', 'java', 'cpp'),
      allowNull: false,
    },
    code: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('queued', 'processing', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'queued',
    },
    resultStatus: {
      type: DataTypes.ENUM(
        'accepted',
        'wrong_answer',
        'compilation_error',
        'runtime_error',
        'time_limit_exceeded',
        'memory_limit_exceeded',
        'internal_error'
      ),
      allowNull: true,
    },
    passedTests: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    totalTests: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    executionTimeMs: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    memoryKb: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    stdout: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    stderr: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    compileOutput: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    testResults: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Submission',
    tableName: 'submissions',
    timestamps: true,
  }
);

module.exports = Submission;
