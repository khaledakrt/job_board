'use strict';

const express = require('express');
const { z } = require('zod');
const candidateNotificationController = require('../controllers/candidateNotification.controller');
const authenticate = require('../middleware/authenticate');
const { requireCandidateRole } = require('../middleware/authorize');
const { requireCandidateProfile } = require('../middleware/requireCandidate');
const { validateParams } = require('../middleware/validateParams');

const router = express.Router();

const notificationIdSchema = z.object({
  id: z.string().uuid(),
});

router.use(authenticate);
router.use(requireCandidateRole);
router.use(requireCandidateProfile);

router.get('/', candidateNotificationController.listNotifications);
router.get('/unread-count', candidateNotificationController.getUnreadCount);
router.patch('/read-all', candidateNotificationController.markAllAsRead);
router.patch(
  '/:id/read',
  validateParams(notificationIdSchema),
  candidateNotificationController.markAsRead
);

module.exports = router;
