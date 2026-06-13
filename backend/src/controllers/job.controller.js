'use strict';

const jobService = require('../services/job.service');
const asyncHandler = require('../utils/asyncHandler');

const listJobs = asyncHandler(async (req, res) => {
  const result = await jobService.listCompanyJobs(req.companyId, req.validatedQuery);

  res.status(200).json({
    success: true,
    data: result.items,
    pagination: result.pagination,
  });
});

const getJob = asyncHandler(async (req, res) => {
  const job = await jobService.getJobById(req.validatedParams.id, req.companyId);

  res.status(200).json({
    success: true,
    data: job,
  });
});

const createJob = asyncHandler(async (req, res) => {
  const job = await jobService.createJob({
    recruiter: req.recruiter,
    companyId: req.companyId,
    payload: req.validatedBody,
  });

  res.status(201).json({
    success: true,
    message: 'Job created successfully',
    data: job,
  });
});

const updateJob = asyncHandler(async (req, res) => {
  const job = await jobService.updateJob({
    jobId: req.validatedParams.id,
    companyId: req.companyId,
    payload: req.validatedBody,
  });

  res.status(200).json({
    success: true,
    message: 'Job updated successfully',
    data: job,
  });
});

const updateJobStatus = asyncHandler(async (req, res) => {
  const job = await jobService.updateJobStatus({
    jobId: req.validatedParams.id,
    companyId: req.companyId,
    status: req.validatedBody.status,
    recruiterUserId: req.user.id,
  });

  res.status(200).json({
    success: true,
    message: 'Job status updated successfully',
    data: job,
  });
});

const archiveJob = asyncHandler(async (req, res) => {
  const job = await jobService.archiveJob({
    jobId: req.validatedParams.id,
    companyId: req.companyId,
    recruiterUserId: req.user.id,
  });

  res.status(200).json({
    success: true,
    message: 'Job archived successfully',
    data: job,
  });
});

const restoreArchivedJob = asyncHandler(async (req, res) => {
  const job = await jobService.restoreArchivedJob({
    jobId: req.validatedParams.id,
    companyId: req.companyId,
  });

  res.status(200).json({
    success: true,
    message: 'Job restored successfully',
    data: job,
  });
});

const generateQuiz = asyncHandler(async (req, res) => {
  const quiz = await jobService.generateQuizFromJobContent(req.validatedBody);

  res.status(200).json({
    success: true,
    message: 'Quiz generated successfully',
    data: quiz,
  });
});

const deleteJob = asyncHandler(async (req, res) => {
  const result = await jobService.deleteJob({
    jobId: req.validatedParams.id,
    companyId: req.companyId,
    recruiterUserId: req.user.id,
  });

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

module.exports = {
  listJobs,
  getJob,
  createJob,
  updateJob,
  updateJobStatus,
  archiveJob,
  restoreArchivedJob,
  generateQuiz,
  deleteJob,
};
