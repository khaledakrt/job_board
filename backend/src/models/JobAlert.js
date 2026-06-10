'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');

class JobAlert extends Model {}

JobAlert.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true },
    candidate_id: { type: DataTypes.CHAR(36), allowNull: false },
    search_filters: { type: DataTypes.JSON, allowNull: false },
    label: { type: DataTypes.STRING(120), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    frequency: {
      type: DataTypes.ENUM('weekly', 'monthly'),
      allowNull: false,
      defaultValue: 'weekly',
    },
    last_sent_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, modelName: 'JobAlert', tableName: 'job_alerts', timestamps: false }
);

module.exports = JobAlert;
