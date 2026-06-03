'use strict';

const recruiterNotificationService = require('../services/recruiterNotification.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const listNotifications = asyncHandler(async (req, res) => {
  if (!req.recruiter) {
    throw ApiError.forbidden('Recruiter profile required');
  }

  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const result = await recruiterNotificationService.listForRecruiter({
    companyId: req.companyId,
    recruiterId: req.recruiter.id,
    limit,
  });

  res.status(200).json({
    success: true,
    data: result.items,
    meta: { unreadCount: result.unreadCount },
  });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  if (!req.recruiter) {
    throw ApiError.forbidden('Recruiter profile required');
  }

  const unreadCount = await recruiterNotificationService.getUnreadCount({
    companyId: req.companyId,
    recruiterId: req.recruiter.id,
  });

  res.status(200).json({
    success: true,
    data: { unreadCount },
  });
});

const markAsRead = asyncHandler(async (req, res) => {
  if (!req.recruiter) {
    throw ApiError.forbidden('Recruiter profile required');
  }

  const notification = await recruiterNotificationService.markAsRead({
    notificationId: req.validatedParams.id,
    companyId: req.companyId,
    recruiterId: req.recruiter.id,
  });

  res.status(200).json({
    success: true,
    data: notification,
  });
});

const markAllAsRead = asyncHandler(async (req, res) => {
  if (!req.recruiter) {
    throw ApiError.forbidden('Recruiter profile required');
  }

  const result = await recruiterNotificationService.markAllAsRead({
    companyId: req.companyId,
    recruiterId: req.recruiter.id,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
