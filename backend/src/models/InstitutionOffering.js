'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');

class InstitutionOffering extends Model {}

InstitutionOffering.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true, allowNull: false },
    institution_id: { type: DataTypes.CHAR(36), allowNull: false },
    offering_type: {
      type: DataTypes.ENUM('program', 'event', 'announcement', 'opportunity'),
      allowNull: false,
    },
    title: { type: DataTypes.STRING(255), allowNull: false },
    summary: { type: DataTypes.STRING(500), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    category: { type: DataTypes.STRING(128), allowNull: true },
    event_type: {
      type: DataTypes.ENUM(
        'open_day',
        'conference',
        'seminar',
        'workshop',
        'webinar',
        'admission_contest',
        'other'
      ),
      allowNull: true,
    },
    opportunity_type: { type: DataTypes.ENUM('job', 'internship'), allowNull: true },
    start_date: { type: DataTypes.DATEONLY, allowNull: true },
    end_date: { type: DataTypes.DATEONLY, allowNull: true },
    start_time: { type: DataTypes.TIME, allowNull: true },
    end_time: { type: DataTypes.TIME, allowNull: true },
    city: { type: DataTypes.STRING(128), allowNull: true },
    address: { type: DataTypes.STRING(512), allowNull: true },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    seats: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    main_image_url: { type: DataTypes.STRING(512), allowNull: true },
    gallery_json: { type: DataTypes.JSON, allowNull: true },
    phone: { type: DataTypes.STRING(64), allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
    website: { type: DataTypes.STRING(512), allowNull: true },
    status: {
      type: DataTypes.ENUM('draft', 'pending', 'published', 'rejected'),
      allowNull: false,
      defaultValue: 'draft',
    },
    admin_note: { type: DataTypes.TEXT, allowNull: true },
    views_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    clicks_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    modelName: 'InstitutionOffering',
    tableName: 'institution_offerings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = InstitutionOffering;
