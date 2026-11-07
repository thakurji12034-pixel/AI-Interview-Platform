const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class TestCase extends Model {}

TestCase.init(
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
    input: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    expectedOutput: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isHidden: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    weight: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    timeLimitMs: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    memoryLimitKb: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'TestCase',
    tableName: 'test_cases',
    timestamps: true,
    updatedAt: false,
  }
);

module.exports = TestCase;
