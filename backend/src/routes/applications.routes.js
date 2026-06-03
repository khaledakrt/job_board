'use strict';

const express = require('express');
const applicationController = require('../controllers/application.controller');
const authenticate = require('../middleware/authenticate');
const { requireRecruiterRole } = require('../middleware/authorize');
const requireRecruiter = require('../middleware/requireRecruiter');
const { checkPermission } = require('../middleware/checkPermission');
const { validateBody } = require('../middleware/validate');
const { validateParams } = require('../middleware/validateParams');
const { validateQuery } = require('../middleware/validateQuery');
const { z } = require('zod');
const { RECRUITER_PERMISSIONS } = require('../config/constants');
const { applicationIdParamSchema } = require('../validators/common.validator');
const {
  updateApplicationStatusSchema,
  createApplicationNoteSchema,
} = require('../validators/application.validator');

const router = express.Router();

router.use(authenticate);
router.use(requireRecruiterRole);
router.use(requireRecruiter);

const listApplicationsQuerySchema = z.object({
  jobId: z.string().uuid().optional(),
  status: z
    .enum(['applied', 'screening', 'interview', 'offer', 'rejected'])
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

router.get(
  '/',
  validateQuery(listApplicationsQuerySchema),
  applicationController.listApplications
);

router.get(
  '/:id',
  validateParams(applicationIdParamSchema),
  applicationController.getApplication
);

router.patch(
  '/:id/status',
  validateParams(applicationIdParamSchema),
  checkPermission(RECRUITER_PERMISSIONS.CAN_DECIDE_APPLICATION),
  validateBody(updateApplicationStatusSchema),
  applicationController.updateApplicationStatus
);

router.post(
  '/:id/notes',
  validateParams(applicationIdParamSchema),
  checkPermission(RECRUITER_PERMISSIONS.CAN_DECIDE_APPLICATION),
  validateBody(createApplicationNoteSchema),
  applicationController.addApplicationNote
);

module.exports = router;
