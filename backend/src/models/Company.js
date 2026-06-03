'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');

class Company extends Model {}

Company.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    legal_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    legal_form: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    siret: {
      type: DataTypes.STRING(14),
      allowNull: true,
    },
    vat_number: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    street_address: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    postal_code: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(64),
      allowNull: true,
      defaultValue: 'France',
    },
    contact_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    contact_phone: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    contact_email_public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    contact_phone_public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    logo_url: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    website: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    linkedin_url: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    industry: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    scale_size: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    founded_year: {
      type: DataTypes.SMALLINT.UNSIGNED,
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
    modelName: 'Company',
    tableName: 'companies',
    timestamps: false,
  }
);

module.exports = Company;
