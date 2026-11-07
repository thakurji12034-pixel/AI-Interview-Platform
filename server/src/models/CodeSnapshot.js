const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class CodeSnapshot extends Model {}

CodeSnapshot.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    roomId: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    interviewId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    language: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'javascript',
    },
    codeContent: {
      type: DataTypes.TEXT('medium'),
      allowNull: false,
    },
    yjsUpdate: {
      type: DataTypes.BLOB('medium'),
      allowNull: true,
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    createdById: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'CodeSnapshot',
    tableName: 'code_snapshots',
    timestamps: true,
    indexes: [
      { name: 'code_snapshots_room_id_idx', fields: ['roomId'] },
      { name: 'code_snapshots_interview_id_idx', fields: ['interviewId'] },
      { name: 'code_snapshots_created_at_idx', fields: ['createdAt'] },
    ],
  }
);

module.exports = CodeSnapshot;

