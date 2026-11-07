const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class SessionQuestion extends Model {}

SessionQuestion.init(
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
    questionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    prompt: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    domain: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    difficulty: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
      allowNull: false,
      defaultValue: 'intermediate',
    },
    type: {
      type: DataTypes.ENUM('coding', 'mcq', 'theory', 'system_design', 'behavioral'),
      allowNull: false,
      defaultValue: 'theory',
    },
    expectedKeyPoints: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    parentQuestionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    followUpDepth: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('pending', 'answered', 'skipped'),
      allowNull: false,
      defaultValue: 'pending',
    },
  },
  {
    sequelize,
    modelName: 'SessionQuestion',
    tableName: 'session_questions',
    timestamps: true,
    indexes: [
      { fields: ['sessionId'] },
      { fields: ['orderIndex'] },
    ],
  }
);

module.exports = SessionQuestion;
