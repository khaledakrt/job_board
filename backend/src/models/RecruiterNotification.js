'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');

class RecruiterNotification extends Model {}

RecruiterNotification.init(
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
    type: {
      type: DataTypes.ENUM('application_received'),
      allowNull: false,
      defaultValue: 'application_received',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    message_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    application_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    job_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    candidate_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    candidate_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    candidate_avatar_url: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    job_title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'RecruiterNotification',
    tableName: 'recruiter_notifications',
    timestamps: false,
  }
);

module.exports = RecruiterNotification;
