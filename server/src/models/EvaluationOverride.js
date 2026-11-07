const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class EvaluationOverride extends Model {}

EvaluationOverride.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    evaluationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    interviewerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    overrideScore: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    humanNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'EvaluationOverride',
    tableName: 'evaluation_overrides',
    timestamps: true,
    indexes: [
      { fields: ['evaluationId'] },
      { fields: ['interviewerId'] },
    ],
  }
);

module.exports = EvaluationOverride;
