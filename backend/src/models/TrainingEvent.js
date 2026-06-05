'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');

class TrainingEvent extends Model {}

TrainingEvent.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true, allowNull: false },
    center_id: { type: DataTypes.CHAR(36), allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    event_type: { type: DataTypes.STRING(80), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    event_date: { type: DataTypes.DATEONLY, allowNull: true },
    start_time: { type: DataTypes.TIME, allowNull: true },
    end_time: { type: DataTypes.TIME, allowNull: true },
    city: { type: DataTypes.STRING(120), allowNull: true },
    address: { type: DataTypes.STRING(255), allowNull: true },
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    seats: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    poster_image_url: { type: DataTypes.STRING(512), allowNull: true },
    gallery_json: { type: DataTypes.JSON, allowNull: true },
    phone: { type: DataTypes.STRING(50), allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
    website: { type: DataTypes.STRING(512), allowNull: true },
    status: {
      type: DataTypes.ENUM('pending', 'published', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    admin_note: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    modelName: 'TrainingEvent',
    tableName: 'training_events',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = TrainingEvent;
