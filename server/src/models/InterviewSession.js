const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class InterviewSession extends Model {}

InterviewSession.init(
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
    interviewerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('technical', 'hr', 'mixed'),
      allowNull: false,
      defaultValue: 'technical',
    },
    difficulty: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
      allowNull: false,
      defaultValue: 'intermediate',
    },
    status: {
      type: DataTypes.ENUM('configured', 'in_progress', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'configured',
    },
    mode: {
      type: DataTypes.ENUM('mock', 'live_assisted'),
      allowNull: false,
      defaultValue: 'mock',
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    endsAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    score: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'InterviewSession',
    tableName: 'interview_sessions',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['status'] },
      { fields: ['startedAt'] },
    ],
  }
);

module.exports = InterviewSession;
