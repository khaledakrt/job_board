'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');

class PlatformSetting extends Model {}

PlatformSetting.init(
  {
    setting_key: {
      type: DataTypes.STRING(100),
      primaryKey: true,
      allowNull: false,
    },
    setting_value: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'PlatformSetting',
    tableName: 'platform_settings',
    timestamps: false,
  }
);

module.exports = PlatformSetting;
