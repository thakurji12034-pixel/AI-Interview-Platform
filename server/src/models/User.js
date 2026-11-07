const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    role: {
      type: DataTypes.ENUM('candidate', 'interviewer'),
      allowNull: false,
      defaultValue: 'candidate',
    },
    refreshToken: { type: DataTypes.TEXT, allowNull: true }, // Stores SHA-256 hash of active refresh token
  },
  { tableName: 'users', timestamps: true }
);

module.exports = User;
