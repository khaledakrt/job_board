'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');

class JobAlert extends Model {}

JobAlert.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true },
    candidate_id: { type: DataTypes.CHAR(36), allowNull: false },
    search_filters: { type: DataTypes.JSON, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, modelName: 'JobAlert', tableName: 'job_alerts', timestamps: false }
);

module.exports = JobAlert;
