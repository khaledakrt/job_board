'use strict';

const jobAlertService = require('../services/candidateJobAlert.service');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  if (!req.candidate) {
    return res.status(200).json({ success: true, data: [] });
  }
  const data = await jobAlertService.listJobAlerts(req.candidate.id);
  res.status(200).json({ success: true, data });
});

const create = asyncHandler(async (req, res) => {
  const data = await jobAlertService.createJobAlert({
    candidateId: req.candidate.id,
    searchFilters: req.validatedBody.searchFilters,
    label: req.validatedBody.label,
    frequency: req.validatedBody.frequency,
    isActive: req.validatedBody.isActive,
  });
  res.status(201).json({ success: true, message: 'Job alert created', data });
});

const update = asyncHandler(async (req, res) => {
  const data = await jobAlertService.updateJobAlert({
    candidateId: req.candidate.id,
    alertId: req.validatedParams.id,
    payload: req.validatedBody,
  });
  res.status(200).json({ success: true, message: 'Job alert updated', data });
});

const remove = asyncHandler(async (req, res) => {
  const result = await jobAlertService.deleteJobAlert({
    candidateId: req.candidate.id,
    alertId: req.validatedParams.id,
  });
  res.status(200).json({ success: true, message: result.message });
});

module.exports = { list, create, update, remove };
