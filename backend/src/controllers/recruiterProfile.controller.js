'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { formatCompany } = require('../services/company.service');
const { RecruiterProfile, Company } = require('../models');

const getProfile = asyncHandler(async (req, res) => {
  const recruiter = await RecruiterProfile.findOne({
    where: { user_id: req.user.id },
    include: [{ model: Company, as: 'company' }],
  });

  if (!recruiter) {
    return res.status(200).json({
      success: true,
      message: 'Profil recruteur à compléter.',
      data: null,
      meta: { onboardingRequired: true },
    });
  }

  res.status(200).json({
    success: true,
    data: {
      id: recruiter.id,
      userId: recruiter.user_id,
      companyId: recruiter.company_id,
      jobTitle: recruiter.job_title,
      phone: recruiter.phone,
      companyRole: recruiter.company_role,
      canPostJob: recruiter.can_post_job,
      canDecideApplication: recruiter.can_decide_application,
      canEditCompany: recruiter.can_edit_company,
      company: recruiter.company ? formatCompany(recruiter.company) : null,
    },
  });
});

module.exports = { getProfile };
