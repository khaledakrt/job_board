'use strict';

const ApiError = require('../utils/ApiError');
const { CandidateProfile, User } = require('../models');
const { USER_ROLES } = require('../config/constants');

async function requireCandidate(req, res, next) {
  try {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    if (req.user.role !== USER_ROLES.CANDIDATE) {
      throw ApiError.forbidden('Candidate access required');
    }

    const candidate = await CandidateProfile.findOne({
      where: { user_id: req.user.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'email', 'is_verified'] }],
    });

    req.candidate = candidate;
    req.candidateId = candidate?.id || null;

    return next();
  } catch (error) {
    return next(error);
  }
}

async function requireCandidateProfile(req, res, next) {
  await requireCandidate(req, res, (err) => {
    if (err) {
      return next(err);
    }

    if (!req.candidate) {
      return next(ApiError.notFound('Candidate profile not found. Create your profile first.'));
    }

    return next();
  });
}

module.exports = {
  requireCandidate,
  requireCandidateProfile,
};
