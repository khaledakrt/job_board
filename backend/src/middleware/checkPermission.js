'use strict';

const ApiError = require('../utils/ApiError');
const { RECRUITER_PERMISSIONS, COMPANY_ROLES } = require('../config/constants');

const VALID_PERMISSIONS = new Set(Object.values(RECRUITER_PERMISSIONS));

/**
 * Validates recruiter permissions: can_post_job, can_decide_application, can_edit_company.
 * Company owners bypass granular checks.
 */
function checkPermission(permissionName) {
  if (!VALID_PERMISSIONS.has(permissionName)) {
    throw new Error(`Invalid permission name: ${permissionName}`);
  }

  return (req, res, next) => {
    if (req.isAdminBypass) {
      return next();
    }

    if (!req.recruiter) {
      return next(ApiError.forbidden('Recruiter profile required'));
    }

    if (req.recruiter.company_role === COMPANY_ROLES.OWNER) {
      return next();
    }

    if (req.recruiter[permissionName] === true) {
      return next();
    }

    return next(
      ApiError.forbidden(`Missing required permission: ${permissionName}`)
    );
  };
}

function requireCompanyOwner(req, res, next) {
  if (req.isAdminBypass) {
    return next();
  }

  if (!req.recruiter) {
    return next(ApiError.forbidden('Recruiter profile required'));
  }

  if (req.recruiter.company_role !== COMPANY_ROLES.OWNER) {
    return next(ApiError.forbidden('Only the company owner can perform this action'));
  }

  return next();
}

module.exports = {
  checkPermission,
  requireCompanyOwner,
};
