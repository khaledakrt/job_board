'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');

class CandidateProfile extends Model {}

CandidateProfile.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      unique: true,
    },
    first_name: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    avatar_url: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    professional_title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    skills: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    languages: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    certifications: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    linkedin_url: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    portfolio_url: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    experiences: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    education: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    resume_url: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    min_salary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    job_preferences: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    notification_preferences: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    onboarding_completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'CandidateProfile',
    tableName: 'candidate_profiles',
    timestamps: false,
  }
);

module.exports = CandidateProfile;
