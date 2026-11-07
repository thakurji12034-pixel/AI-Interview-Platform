const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class QuestionTopic extends Model {}

QuestionTopic.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    questionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    topic: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'QuestionTopic',
    tableName: 'question_topics',
    timestamps: true,
    updatedAt: false,
  }
);

module.exports = QuestionTopic;
