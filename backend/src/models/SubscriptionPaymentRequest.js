'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');

class SubscriptionPaymentRequest extends Model {}

SubscriptionPaymentRequest.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      allowNull: false,
    },
    company_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    plan_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    provider: {
      type: DataTypes.ENUM('konnect', 'manual'),
      allowNull: false,
      defaultValue: 'konnect',
    },
    status: {
      type: DataTypes.ENUM('pending', 'payment_pending', 'paid', 'rejected', 'failed', 'canceled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    amount_tnd: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
    },
    currency: {
      type: DataTypes.CHAR(3),
      allowNull: false,
      defaultValue: 'TND',
    },
    provider_payment_ref: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    provider_payment_url: {
      type: DataTypes.STRING(1024),
      allowNull: true,
    },
    payer_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    payer_phone: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    admin_note: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewed_by: {
      type: DataTypes.CHAR(36),
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
    modelName: 'SubscriptionPaymentRequest',
    tableName: 'subscription_payment_requests',
    timestamps: false,
  }
);

module.exports = SubscriptionPaymentRequest;
