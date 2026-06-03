'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');

class RecruiterNotificationRead extends Model {}

RecruiterNotificationRead.init(
  {
    notification_id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      allowNull: false,
    },
    recruiter_id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      allowNull: false,
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'RecruiterNotificationRead',
    tableName: 'recruiter_notification_reads',
    timestamps: false,
  }
);

module.exports = RecruiterNotificationRead;
