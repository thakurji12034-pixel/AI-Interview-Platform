const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Invitation = sequelize.define(
  'Invitation',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: { isEmail: true },
    },
    role: {
      type: DataTypes.ENUM('interviewer', 'admin'),
      allowNull: false,
    },
    tokenHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    invitedById: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  { tableName: 'invitations', timestamps: true }
);

module.exports = Invitation;

