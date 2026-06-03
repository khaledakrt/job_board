'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');
const { JOB_STATUS, REMOTE_TYPES, CONTRACT_TYPES } = require('../config/constants');

class Job extends Model {}

Job.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      allowNull: false,
    },
    company_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    recruiter_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    requirements: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    languages: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    benefits: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    remote_type: {
      type: DataTypes.ENUM(...REMOTE_TYPES),
      allowNull: false,
      defaultValue: 'on-site',
    },
    contract_type: {
      type: DataTypes.ENUM(...CONTRACT_TYPES),
      allowNull: false,
      defaultValue: 'CDI',
    },
    salary_label: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    experience_years: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        JOB_STATUS.DRAFT,
        JOB_STATUS.ACTIVE,
        JOB_STATUS.HIDDEN,
        JOB_STATUS.EXPIRED
      ),
      allowNull: false,
      defaultValue: JOB_STATUS.DRAFT,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    views_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    applications_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    quiz_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    quiz_data: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'Job',
    tableName: 'jobs',
    timestamps: false,
  }
);

module.exports = Job;
