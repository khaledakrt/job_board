'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');

class FormationParticipation extends Model {}

FormationParticipation.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true, allowNull: false },
    formation_id: { type: DataTypes.CHAR(36), allowNull: false },
    user_id: { type: DataTypes.CHAR(36), allowNull: false },
    participation_type: {
      type: DataTypes.ENUM('interested', 'registered'),
      allowNull: false,
    },
    created_at: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    modelName: 'FormationParticipation',
    tableName: 'formation_participations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

module.exports = FormationParticipation;
