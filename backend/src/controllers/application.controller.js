'use strict';

const applicationService = require('../services/application.service');
const asyncHandler = require('../utils/asyncHandler');

const updateApplicationStatus = asyncHandler(async (req, res) => {
  const result = await applicationService.updateApplicationStatus({
    applicationId: req.validatedParams.id,
    companyId: req.companyId,
    status: req.validatedBody.status,
    rating: req.validatedBody.rating,
    evaluationText: req.validatedBody.evaluationText,
    interviewAt: req.validatedBody.interviewAt,
    recruiterUser: { id: req.user.id, email: req.user.email },
  });

  res.status(200).json({
    success: true,
    message: 'Application status updated successfully',
    data: result.application,
    meta: {
      notification: result.alert?.notification
        ? { id: result.alert.notification.id }
        : null,
      emailSent: result.alert?.email?.sent ?? false,
    },
  });
});

const addApplicationNote = asyncHandler(async (req, res) => {
  const result = await applicationService.addApplicationNote({
    applicationId: req.validatedParams.id,
    companyId: req.companyId,
    authorId: req.user.id,
    noteText: req.validatedBody.noteText,
    recruiterUser: { id: req.user.id, email: req.user.email },
  });

  res.status(201).json({
    success: true,
    message: 'Application note added successfully',
    data: result.note,
    meta: {
      notification: result.alert?.notification
        ? { id: result.alert.notification.id }
        : null,
      emailSent: result.alert?.email?.sent ?? false,
    },
  });
});

const listApplications = asyncHandler(async (req, res) => {
  const result = await applicationService.listCompanyApplications(req.companyId, {
    jobId: req.validatedQuery.jobId,
    status: req.validatedQuery.status,
    page: req.validatedQuery.page,
    limit: req.validatedQuery.limit,
  });

  res.status(200).json({
    success: true,
    data: result.items,
    pagination: result.pagination,
  });
});

const getApplication = asyncHandler(async (req, res) => {
  const application = await applicationService.getApplicationDetail(
    req.validatedParams.id,
    req.companyId
  );

  res.status(200).json({
    success: true,
    data: application,
  });
});

module.exports = {
  listApplications,
  getApplication,
  updateApplicationStatus,
  addApplicationNote,
};
