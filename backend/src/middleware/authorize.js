'use strict';

const ApiError = require('../utils/ApiError');
const { USER_ROLES } = require('../config/constants');

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    return next(ApiError.forbidden('You do not have permission to access this resource'));
  };
}

const requireRecruiterRole = authorizeRoles(USER_ROLES.RECRUITER);
const requireCandidateRole = authorizeRoles(USER_ROLES.CANDIDATE);
const requireTrainingProviderRole = authorizeRoles(
  USER_ROLES.TRAINING_PROVIDER,
  USER_ROLES.ADMIN
);
const requireInstitutionProviderRole = authorizeRoles(
  USER_ROLES.INSTITUTION_PROVIDER,
  USER_ROLES.ADMIN
);

module.exports = {
  authorizeRoles,
  requireRecruiterRole,
  requireCandidateRole,
  requireTrainingProviderRole,
  requireInstitutionProviderRole,
};
