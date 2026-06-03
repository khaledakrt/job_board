'use strict';

const candidateApplicationService = require('../services/candidateApplication.service');
const asyncHandler = require('../utils/asyncHandler');

const generateCoverLetter = asyncHandler(async (req, res) => {
  const letter = await candidateApplicationService.generateApplicationLetter({
    candidate: req.candidate,
    jobId: req.validatedBody.jobId,
  });

  res.status(200).json({
    success: true,
    message: 'Cover letter generated successfully',
    data: letter,
  });
});

const applyToJob = asyncHandler(async (req, res) => {
  const result = await candidateApplicationService.applyToJob({
    candidate: req.candidate,
    jobId: req.validatedParams.id,
    coverLetter: req.validatedBody.coverLetter,
    quizAnswers: req.validatedBody.quizAnswers,
  });

  res.status(201).json({
    success: true,
    message: 'Application submitted successfully',
    data: result.application,
    meta: {
      job: result.job,
    },
  });
});

const listAppliedJobIds = asyncHandler(async (req, res) => {
  const jobIds = await candidateApplicationService.listAppliedJobIds(req.candidate.id);

  res.status(200).json({
    success: true,
    data: jobIds,
  });
});

const getApplicationDetail = asyncHandler(async (req, res) => {
  const data = await candidateApplicationService.getCandidateApplicationDetail({
    candidateId: req.candidate.id,
    applicationId: req.validatedParams.id,
  });

  res.status(200).json({
    success: true,
    data,
  });
});

const listMyApplications = asyncHandler(async (req, res) => {
  const data = await candidateApplicationService.listCandidateApplications(
    req.candidate.id
  );

  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  listMyApplications,
  getApplicationDetail,
  listAppliedJobIds,
  generateCoverLetter,
  applyToJob,
};
