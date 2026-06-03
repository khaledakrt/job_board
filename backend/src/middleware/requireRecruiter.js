'use strict';

const ApiError = require('../utils/ApiError');
const { RecruiterProfile, Company } = require('../models');
const { USER_ROLES } = require('../config/constants');

async function requireRecruiter(req, res, next) {
  try {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    if (req.user.role === USER_ROLES.ADMIN) {
      const companyId = req.params.id || req.params.companyId || req.body.companyId;

      if (companyId) {
        const company = await Company.findByPk(companyId);
        if (!company) {
          throw ApiError.notFound('Company not found');
        }
        req.company = company;
        req.companyId = company.id;
      }

      req.recruiter = null;
      req.isAdminBypass = true;
      return next();
    }

    if (req.user.role !== USER_ROLES.RECRUITER) {
      throw ApiError.forbidden('Recruiter workspace access required');
    }

    const recruiter = await RecruiterProfile.findOne({
      where: { user_id: req.user.id },
      include: [{ model: Company, as: 'company' }],
    });

    if (!recruiter) {
      throw ApiError.forbidden('Recruiter profile not found. Join or create a company first.');
    }

    req.recruiter = recruiter;
    req.company = recruiter.company;
    req.companyId = recruiter.company_id;
    req.isAdminBypass = false;

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = requireRecruiter;
