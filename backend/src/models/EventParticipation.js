'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');

class EventParticipation extends Model {}

EventParticipation.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true, allowNull: false },
    event_id: { type: DataTypes.CHAR(36), allowNull: false },
    user_id: { type: DataTypes.CHAR(36), allowNull: false },
    participation_type: {
      type: DataTypes.ENUM('interested', 'registered'),
      allowNull: false,
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    modelName: 'EventParticipation',
    tableName: 'event_participations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

module.exports = EventParticipation;
