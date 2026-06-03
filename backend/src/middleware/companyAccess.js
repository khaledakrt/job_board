'use strict';

const ApiError = require('../utils/ApiError');

function requireSameCompany(req, res, next) {
  const companyId = req.validatedParams?.id || req.params.id;

  if (req.isAdminBypass) {
    return next();
  }

  if (!req.recruiter || req.recruiter.company_id !== companyId) {
    return next(ApiError.forbidden('You can only access your own company workspace'));
  }

  return next();
}

module.exports = { requireSameCompany };
