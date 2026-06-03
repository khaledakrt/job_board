'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');

class SavedJob extends Model {}

SavedJob.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true },
    candidate_id: { type: DataTypes.CHAR(36), allowNull: false },
    job_id: { type: DataTypes.CHAR(36), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, modelName: 'SavedJob', tableName: 'saved_jobs', timestamps: false }
);

module.exports = SavedJob;
