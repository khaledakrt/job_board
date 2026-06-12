'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');

class TrainingFormation extends Model {}

TrainingFormation.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true, allowNull: false },
    center_id: { type: DataTypes.CHAR(36), allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    category: { type: DataTypes.STRING(120), allowNull: true },
    short_description: { type: DataTypes.STRING(500), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    start_date: { type: DataTypes.DATEONLY, allowNull: true },
    end_date: { type: DataTypes.DATEONLY, allowNull: true },
    duration_label: { type: DataTypes.STRING(120), allowNull: true },
    city: { type: DataTypes.STRING(120), allowNull: true },
    address: { type: DataTypes.STRING(255), allowNull: true },
    delivery_mode: {
      type: DataTypes.ENUM('online', 'onsite', 'hybrid'),
      allowNull: true,
    },
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    certificate_delivered: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    seats: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    main_image_url: { type: DataTypes.STRING(512), allowNull: true },
    gallery_json: { type: DataTypes.JSON, allowNull: true },
    phone: { type: DataTypes.STRING(50), allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
    website: { type: DataTypes.STRING(512), allowNull: true },
    status: {
      type: DataTypes.ENUM('draft', 'pending', 'published', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    admin_note: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    modelName: 'TrainingFormation',
    tableName: 'training_formations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = TrainingFormation;
