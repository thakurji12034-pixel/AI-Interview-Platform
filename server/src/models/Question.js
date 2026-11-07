const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

const DOMAINS = [
  'DSA',
  'Java',
  'OOP',
  'DBMS',
  'Operating Systems',
  'Computer Networks',
  'SQL',
  'JavaScript',
  'React',
  'System Design',
];

class Question extends Model {}

Question.init(
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
    statement: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    domain: {
      type: DataTypes.ENUM(...DOMAINS),
      allowNull: false,
    },
    difficulty: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
      allowNull: false,
      defaultValue: 'intermediate',
    },
    type: {
      type: DataTypes.ENUM('coding', 'mcq', 'theory', 'system_design'),
      allowNull: false,
      defaultValue: 'coding',
    },
    starterCode: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    referenceKeyPoints: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      allowNull: false,
      defaultValue: 'published',
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Question',
    tableName: 'questions',
    timestamps: true,
  }
);

module.exports = Question;
