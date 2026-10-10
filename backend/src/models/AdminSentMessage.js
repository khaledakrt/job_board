'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');

class AdminSentMessage extends Model {}

AdminSentMessage.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      allowNull: false,
    },
    actor_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
    },
    sender_name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    sender_email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING(180),
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    recipients: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    sent_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    failed_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'AdminSentMessage',
    tableName: 'admin_sent_messages',
    timestamps: false,
  }
);

module.exports = AdminSentMessage;
