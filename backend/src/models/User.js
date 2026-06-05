'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');
const { USER_ROLES } = require('../config/constants');

class User extends Model {}

User.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(
        USER_ROLES.CANDIDATE,
        USER_ROLES.RECRUITER,
        USER_ROLES.ADMIN,
        USER_ROLES.TRAINING_PROVIDER,
        USER_ROLES.INSTITUTION_PROVIDER
      ),
      allowNull: false,
      defaultValue: USER_ROLES.CANDIDATE,
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_banned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    ban_reason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    banned_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_login_ip: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    verification_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    reset_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    reset_expires: {
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
    modelName: 'User',
    tableName: 'users',
    timestamps: false,
  }
);

module.exports = User;
