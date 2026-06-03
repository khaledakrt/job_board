'use strict';

const savedJobService = require('../services/candidateSavedJob.service');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await savedJobService.listSavedJobs(req.candidate.id);
  res.status(200).json({ success: true, data });
});

const save = asyncHandler(async (req, res) => {
  const data = await savedJobService.saveJob({
    candidateId: req.candidate.id,
    jobId: req.validatedBody.jobId,
  });
  res.status(201).json({ success: true, message: 'Job saved', data });
});

const remove = asyncHandler(async (req, res) => {
  const result = await savedJobService.removeSavedJob({
    candidateId: req.candidate.id,
    savedJobId: req.validatedParams.id,
  });
  res.status(200).json({ success: true, message: result.message });
});

module.exports = { list, save, remove };
