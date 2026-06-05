'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');

class InstitutionParticipation extends Model {}

InstitutionParticipation.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true, allowNull: false },
    offering_id: { type: DataTypes.CHAR(36), allowNull: false },
    user_id: { type: DataTypes.CHAR(36), allowNull: false },
    participation_type: {
      type: DataTypes.ENUM('interested', 'registered'),
      allowNull: false,
      defaultValue: 'registered',
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    modelName: 'InstitutionParticipation',
    tableName: 'institution_participations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

module.exports = InstitutionParticipation;
