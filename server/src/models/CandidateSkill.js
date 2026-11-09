const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class CandidateSkill extends Model {}

CandidateSkill.init(
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
    skillName: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    proficiencyLevel: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'expert'),
      allowNull: false,
      defaultValue: 'intermediate',
    },
    yearsOfExperience: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    source: {
      type: DataTypes.ENUM('resume', 'assessment', 'interview'),
      allowNull: false,
      defaultValue: 'resume',
    },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'CandidateSkill',
    tableName: 'candidate_skills',
    timestamps: true,
    indexes: [
      { fields: ['userId', 'skillName'], unique: true },
      { fields: ['userId'] },
      { fields: ['category'] },
    ],
  }
);

module.exports = CandidateSkill;
