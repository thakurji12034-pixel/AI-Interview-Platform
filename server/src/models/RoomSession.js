const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class RoomSession extends Model {}

RoomSession.init(
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
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'candidate',
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    leftAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    durationSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'RoomSession',
    tableName: 'room_sessions',
    timestamps: true,
    indexes: [
      { name: 'room_sessions_room_id_idx', fields: ['roomId'] },
      { name: 'room_sessions_interview_id_idx', fields: ['interviewId'] },
      { name: 'room_sessions_user_id_idx', fields: ['userId'] },
    ],
  }
);

module.exports = RoomSession;

