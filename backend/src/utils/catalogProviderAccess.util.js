'use strict';

const { TrainingCenter, PrivateInstitution } = require('../models');
const ApiError = require('./ApiError');

function isProfileComplete(entity) {
  const desc = entity.description?.trim() ?? '';
  return Boolean(
    entity.name?.trim() &&
      entity.city?.trim() &&
      desc.length >= 20 &&
      entity.logo_url
  );
}

async function getTrainingCenterForUser(userId) {
  const center = await TrainingCenter.findOne({ where: { user_id: userId } });
  if (!center) {
    throw ApiError.notFound('Aucun centre associé à ce compte');
  }
  return center;
}

async function getInstitutionForUser(userId) {
  const row = await PrivateInstitution.findOne({ where: { user_id: userId } });
  if (!row) {
    throw ApiError.notFound('Aucun établissement associé à ce compte');
  }
  return row;
}

module.exports = {
  isProfileComplete,
  getTrainingCenterForUser,
  getInstitutionForUser,
};
