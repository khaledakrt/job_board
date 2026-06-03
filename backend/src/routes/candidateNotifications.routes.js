'use strict';

const express = require('express');
const { z } = require('zod');
const candidateNotificationController = require('../controllers/candidateNotification.controller');
const authenticate = require('../middleware/authenticate');
const { requireCandidateRole } = require('../middleware/authorize');
const { requireCandidate, requireCandidateProfile } = require('../middleware/requireCandidate');
const { validateParams } = require('../middleware/validateParams');

const router = express.Router();

const notificationIdSchema = z.object({
  id: z.string().uuid(),
});

router.use(authenticate);
router.use(requireCandidateRole);

router.get('/', requireCandidate, candidateNotificationController.listNotifications);
router.get('/unread-count', requireCandidate, candidateNotificationController.getUnreadCount);

router.use(requireCandidateProfile);
router.patch('/read-all', candidateNotificationController.markAllAsRead);
router.patch(
  '/:id/read',
  validateParams(notificationIdSchema),
  candidateNotificationController.markAsRead
);

module.exports = router;
