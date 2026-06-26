'use strict';

const { QueryTypes } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');
const sequelize = require('../database/sequelize');
const { formatCompany } = require('../services/company.service');
const subscriptionService = require('../services/subscription.service');
const { RecruiterProfile, Company } = require('../models');
const { JOB_STATUS } = require('../config/constants');

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

  const [subscriptionMode, subscription] = await Promise.all([
    subscriptionService.getRecruiterSubscriptionMode(),
    recruiter.company_id
      ? subscriptionService.getCompanySubscription(recruiter.company_id)
      : Promise.resolve(subscriptionService.formatSubscription(null)),
  ]);
  const canPublish =
    subscriptionMode === subscriptionService.SUBSCRIPTION_MODES.FREE_ALL || subscription.isActive;

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
      publicationAccess: {
        mode: subscriptionMode,
        companySubscriptionStatus: subscription.status,
        companySubscriptionEndsAt: subscription.currentPeriodEnd,
        canPublish,
        reason: canPublish
          ? subscriptionMode === subscriptionService.SUBSCRIPTION_MODES.FREE_ALL
            ? 'free_global'
            : 'company_subscription_active'
          : 'company_subscription_required',
      },
      company: recruiter.company ? formatCompany(recruiter.company) : null,
    },
  });
});

const getSummary = asyncHandler(async (req, res) => {
  const recruiter = await RecruiterProfile.findOne({
    where: { user_id: req.user.id },
    attributes: ['id', 'company_id'],
  });

  if (!recruiter?.company_id) {
    return res.status(200).json({
      success: true,
      data: { totalJobs: 0, totalViews: 0, totalApplicants: 0, activeJobs: 0 },
    });
  }

  const rows = await sequelize.query(
    `
      SELECT
        (SELECT COUNT(*) FROM jobs WHERE company_id = :companyId AND deleted_by_recruiter_at IS NULL AND archived_at IS NULL AND status NOT IN (:expiredStatus)) AS totalJobs,
        (SELECT COALESCE(SUM(views_count), 0) FROM jobs WHERE company_id = :companyId) AS totalViews,
        (
          SELECT COUNT(*)
          FROM applications a
          INNER JOIN jobs j ON j.id = a.job_id
          WHERE j.company_id = :companyId
        ) AS totalApplicants,
        (
          SELECT COUNT(*)
          FROM jobs
          WHERE company_id = :companyId AND status = :activeStatus
        ) AS activeJobs
    `,
    {
      replacements: {
        companyId: recruiter.company_id,
        activeStatus: JOB_STATUS.ACTIVE,
        expiredStatus: JOB_STATUS.EXPIRED,
      },
      type: QueryTypes.SELECT,
    }
  );

  const row = rows[0] || {};
  const summary = {
    totalJobs: Number(row.totalJobs || 0),
    totalViews: Number(row.totalViews || 0),
    totalApplicants: Number(row.totalApplicants || 0),
    activeJobs: Number(row.activeJobs || 0),
  };

  res.status(200).json({ success: true, data: summary });
});

module.exports = { getProfile, getSummary };
