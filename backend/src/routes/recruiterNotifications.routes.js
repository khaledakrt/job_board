'use strict';

const express = require('express');
const recruiterNotificationController = require('../controllers/recruiterNotification.controller');
const authenticate = require('../middleware/authenticate');
const { requireRecruiterRole } = require('../middleware/authorize');
const requireRecruiter = require('../middleware/requireRecruiter');
const { validateParams } = require('../middleware/validateParams');
const { z } = require('zod');

const router = express.Router();

const notificationIdSchema = z.object({
  id: z.string().uuid(),
});

router.use(authenticate);
router.use(requireRecruiterRole);
router.use(requireRecruiter);

router.get('/', recruiterNotificationController.listNotifications);
router.get('/unread-count', recruiterNotificationController.getUnreadCount);
router.patch('/read-all', recruiterNotificationController.markAllAsRead);
router.patch(
  '/:id/read',
  validateParams(notificationIdSchema),
  recruiterNotificationController.markAsRead
);

module.exports = router;
