'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');

class PrivateInstitution extends Model {}

PrivateInstitution.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true, allowNull: false },
    user_id: { type: DataTypes.CHAR(36), allowNull: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    institution_type: {
      type: DataTypes.ENUM(
        'primary',
        'college',
        'high_school',
        'higher_institute',
        'university',
        'academy'
      ),
      allowNull: false,
    },
    logo_url: { type: DataTypes.STRING(512), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    short_description: { type: DataTypes.STRING(500), allowNull: true },
    city: { type: DataTypes.STRING(128), allowNull: true },
    address: { type: DataTypes.STRING(512), allowNull: true },
    phone: { type: DataTypes.STRING(64), allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
    website: { type: DataTypes.STRING(512), allowNull: true },
    map_url: { type: DataTypes.STRING(512), allowNull: true },
    photos_json: { type: DataTypes.JSON, allowNull: true },
    social_links_json: { type: DataTypes.JSON, allowNull: true },
    programs_json: { type: DataTypes.JSON, allowNull: true },
    brochures_json: { type: DataTypes.JSON, allowNull: true },
    status: {
      type: DataTypes.ENUM('pending', 'published', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    modelName: 'PrivateInstitution',
    tableName: 'private_institutions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = PrivateInstitution;
