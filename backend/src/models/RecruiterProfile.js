'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');
const { COMPANY_ROLES } = require('../config/constants');

class RecruiterProfile extends Model {}

RecruiterProfile.init(
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
    company_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    job_title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    company_role: {
      type: DataTypes.ENUM(COMPANY_ROLES.OWNER, COMPANY_ROLES.RECRUITER),
      allowNull: false,
      defaultValue: COMPANY_ROLES.RECRUITER,
    },
    can_post_job: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    can_decide_application: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    can_edit_company: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'RecruiterProfile',
    tableName: 'recruiter_profiles',
    timestamps: false,
  }
);

module.exports = RecruiterProfile;
