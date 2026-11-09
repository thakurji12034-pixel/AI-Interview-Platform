const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class InterviewTemplate extends Model {}

InterviewTemplate.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    domain: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
    },
    sections: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'InterviewTemplate',
    tableName: 'interview_templates',
    timestamps: true,
  }
);

module.exports = InterviewTemplate;
