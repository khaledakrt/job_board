'use strict';

const express = require('express');
const recruiterNotificationController = require('../controllers/recruiterNotification.controller');
const authenticate = require('../middleware/authenticate');
const { requireRecruiterRole } = require('../middleware/authorize');
const requireRecruiter = require('../middleware/requireRecruiter');
const { checkPermission } = require('../middleware/checkPermission');
const { validateParams } = require('../middleware/validateParams');
const { RECRUITER_PERMISSIONS } = require('../config/constants');
const { z } = require('zod');

const router = express.Router();

const notificationIdSchema = z.object({
  id: z.string().uuid(),
});

router.use(authenticate);
router.use(requireRecruiterRole);
router.use(requireRecruiter);
router.use(checkPermission(RECRUITER_PERMISSIONS.CAN_DECIDE_APPLICATION));

router.get('/', recruiterNotificationController.listNotifications);
router.get('/unread-count', recruiterNotificationController.getUnreadCount);
router.patch('/read-all', recruiterNotificationController.markAllAsRead);
router.patch(
  '/:id/read',
  validateParams(notificationIdSchema),
  recruiterNotificationController.markAsRead
);

module.exports = router;
