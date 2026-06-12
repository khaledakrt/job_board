'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../database/sequelize');

class ApplicationNote extends Model {}

ApplicationNote.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      allowNull: false,
    },
    application_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    author_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    note_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    visible_to_candidate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'ApplicationNote',
    tableName: 'application_notes',
    timestamps: false,
  }
);

module.exports = ApplicationNote;
