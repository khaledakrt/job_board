'use strict';

const candidateNotificationService = require('../services/candidateNotification.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const listNotifications = asyncHandler(async (req, res) => {
  if (!req.candidate) {
    throw ApiError.notFound('Candidate profile not found');
  }

  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const result = await candidateNotificationService.listForCandidate({
    candidateId: req.candidate.id,
    limit,
  });

  res.status(200).json({
    success: true,
    data: result.items,
    meta: { unreadCount: result.unreadCount },
  });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  if (!req.candidate) {
    throw ApiError.notFound('Candidate profile not found');
  }

  const unreadCount = await candidateNotificationService.getUnreadCount({
    candidateId: req.candidate.id,
  });

  res.status(200).json({
    success: true,
    data: { unreadCount },
  });
});

const markAsRead = asyncHandler(async (req, res) => {
  if (!req.candidate) {
    throw ApiError.notFound('Candidate profile not found');
  }

  const notification = await candidateNotificationService.markAsRead({
    notificationId: req.validatedParams.id,
    candidateId: req.candidate.id,
  });

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  res.status(200).json({
    success: true,
    data: notification,
  });
});

const markAllAsRead = asyncHandler(async (req, res) => {
  if (!req.candidate) {
    throw ApiError.notFound('Candidate profile not found');
  }

  const result = await candidateNotificationService.markAllAsRead({
    candidateId: req.candidate.id,
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
