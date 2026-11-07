const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Answer extends Model {}

Answer.init(
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
    sessionQuestionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    candidateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    answerText: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    codeSnippet: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    language: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    timeSpentSeconds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'Answer',
    tableName: 'answers',
    timestamps: true,
    indexes: [
      { fields: ['sessionId'] },
      { fields: ['sessionQuestionId'] },
      { fields: ['candidateId'] },
    ],
  }
);

module.exports = Answer;
