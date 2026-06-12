'use strict';

const dashboardService = require('../services/candidateDashboard.service');
const candidateProfileService = require('../services/candidateProfile.service');
const { CandidateProfile } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const EMPTY_SUMMARY = {
  totals: {
    applications: 0,
    active: 0,
    archived: 0,
    interview: 0,
    offer: 0,
  },
  responseRate: 0,
  monthlyApplications: [],
};

const getSummary = asyncHandler(async (req, res) => {
  if (!req.candidate) {
    return res.status(200).json({ success: true, data: EMPTY_SUMMARY });
  }

  const data = await dashboardService.getDashboardSummary(req.candidate.id);
  res.status(200).json({ success: true, data });
});

const getRecommended = asyncHandler(async (req, res) => {
  if (!req.candidate) {
    return res.status(200).json({ success: true, data: [] });
  }

  const data = await dashboardService.getRecommendedJobs(req.candidate.id);
  res.status(200).json({ success: true, data });
});

const getRecruiterPreview = asyncHandler(async (req, res) => {
  if (!req.candidate) {
    return res.status(200).json({
      success: true,
      data: {
        profile: {},
        completionPercent: 0,
        tips: [{ id: 'profile', text: 'Créez votre profil pour commencer à postuler.' }],
      },
    });
  }

  const profile = await CandidateProfile.findByPk(req.candidate.id);
  if (!profile) {
    throw ApiError.notFound('Candidate profile not found');
  }
  const data = dashboardService.formatRecruiterPreview(profile);
  res.status(200).json({ success: true, data });
});

module.exports = {
  getSummary,
  getRecommended,
  getRecruiterPreview,
};
