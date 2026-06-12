'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');

class AdminAuditLog extends Model {}

AdminAuditLog.init(
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
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    target_type: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    target_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
    },
    metadata: {
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
    modelName: 'AdminAuditLog',
    tableName: 'admin_audit_logs',
    timestamps: false,
  }
);

module.exports = AdminAuditLog;
