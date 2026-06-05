'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');

class TrainingCourse extends Model {}

TrainingCourse.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true, allowNull: false },
    center_id: { type: DataTypes.CHAR(36), allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    delivery_mode: {
      type: DataTypes.ENUM('online', 'onsite', 'hybrid'),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('draft', 'published'),
      allowNull: false,
      defaultValue: 'published',
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    modelName: 'TrainingCourse',
    tableName: 'training_courses',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = TrainingCourse;
