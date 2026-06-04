'use strict';

const dashboardService = require('../services/candidateDashboard.service');
const candidateProfileService = require('../services/candidateProfile.service');
const { CandidateProfile } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const getSummary = asyncHandler(async (req, res) => {
  const data = await dashboardService.getDashboardSummary(req.candidate.id);
  res.status(200).json({ success: true, data });
});

const getRecommended = asyncHandler(async (req, res) => {
  const data = await dashboardService.getRecommendedJobs(req.candidate.id);
  res.status(200).json({ success: true, data });
});

const getRecruiterPreview = asyncHandler(async (req, res) => {
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
