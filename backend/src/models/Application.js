'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');
const { APPLICATION_STATUS } = require('../config/constants');

class Application extends Model {}

Application.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
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
    status: {
      type: DataTypes.ENUM(
        APPLICATION_STATUS.APPLIED,
        APPLICATION_STATUS.SCREENING,
        APPLICATION_STATUS.INTERVIEW,
        APPLICATION_STATUS.OFFER,
        APPLICATION_STATUS.REJECTED
      ),
      allowNull: false,
      defaultValue: APPLICATION_STATUS.APPLIED,
    },
    cover_letter: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    quiz_answers: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    resume_snapshot_url: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    rating: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'Application',
    tableName: 'applications',
    timestamps: false,
  }
);

module.exports = Application;
