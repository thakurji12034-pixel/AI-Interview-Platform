const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Interview = sequelize.define(
  'Interview',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    interviewerId: { type: DataTypes.INTEGER, allowNull: false },
    candidateId: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING(150), allowNull: false },
    scheduledAt: { type: DataTypes.DATE, allowNull: false },
    durationMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 60 },
    endAt: { type: DataTypes.DATE, allowNull: false }, // Calculated session end timestamp to optimize clash detection
    status: {
      type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'scheduled',
    },
    roomId: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4, // Unique identifier used for collaborative coding room routing
    },
  },
  { tableName: 'interviews', timestamps: true }
);

module.exports = Interview;
