const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Resume extends Model {}

Resume.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    originalFileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    storedFileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    mimeType: {
      type: DataTypes.STRING(128),
      allowNull: false,
      defaultValue: 'application/pdf',
    },
    extractedText: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    parsedData: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('uploaded', 'parsing', 'parsed', 'failed'),
      allowNull: false,
      defaultValue: 'uploaded',
    },
    parseError: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Resume',
    tableName: 'resumes',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['storedFileName'] },
    ],
  }
);

module.exports = Resume;
