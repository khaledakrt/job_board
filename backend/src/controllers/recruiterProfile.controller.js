'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { formatCompany } = require('../services/company.service');

const getProfile = asyncHandler(async (req, res) => {
  const recruiter = req.recruiter;

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
      company: req.company ? formatCompany(req.company) : null,
    },
  });
});

module.exports = { getProfile };
