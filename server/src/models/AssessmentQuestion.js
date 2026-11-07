const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class AssessmentQuestion extends Model {}

AssessmentQuestion.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    assessmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    questionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    candidateCode: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('unanswered', 'submitted', 'evaluated'),
      allowNull: false,
      defaultValue: 'unanswered',
    },
    score: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'AssessmentQuestion',
    tableName: 'assessment_questions',
    timestamps: true,
  }
);

module.exports = AssessmentQuestion;
