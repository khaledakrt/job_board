'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');

class RefreshSession extends Model {}

RefreshSession.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    token_hash: {
      type: DataTypes.CHAR(64),
      allowNull: false,
      unique: true,
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    revoked_at: {
      type: DataTypes.DATE,
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
    modelName: 'RefreshSession',
    tableName: 'refresh_sessions',
    timestamps: false,
  }
);

module.exports = RefreshSession;
