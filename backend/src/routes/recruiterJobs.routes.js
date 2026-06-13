'use strict';

const express = require('express');
const jobController = require('../controllers/job.controller');
const authenticate = require('../middleware/authenticate');
const { requireRecruiterRole } = require('../middleware/authorize');
const requireRecruiter = require('../middleware/requireRecruiter');
const { checkPermission } = require('../middleware/checkPermission');
const { validateBody } = require('../middleware/validate');
const { validateParams } = require('../middleware/validateParams');
const { validateQuery } = require('../middleware/validateQuery');
const { RECRUITER_PERMISSIONS } = require('../config/constants');
const { jobIdParamSchema } = require('../validators/common.validator');
const {
  createJobSchema,
  updateJobSchema,
  updateJobStatusSchema,
  listJobsQuerySchema,
  generateQuizSchema,
} = require('../validators/job.validator');

const router = express.Router();

router.use(authenticate);
router.use(requireRecruiterRole);
router.use(requireRecruiter);

router.get('/', validateQuery(listJobsQuerySchema), jobController.listJobs);

router.post(
  '/generate-quiz',
  checkPermission(RECRUITER_PERMISSIONS.CAN_POST_JOB),
  validateBody(generateQuizSchema),
  jobController.generateQuiz
);

router.get('/:id', validateParams(jobIdParamSchema), jobController.getJob);

router.post(
  '/',
  checkPermission(RECRUITER_PERMISSIONS.CAN_POST_JOB),
  validateBody(createJobSchema),
  jobController.createJob
);

router.put(
  '/:id',
  validateParams(jobIdParamSchema),
  checkPermission(RECRUITER_PERMISSIONS.CAN_POST_JOB),
  validateBody(updateJobSchema),
  jobController.updateJob
);

router.patch(
  '/:id/status',
  validateParams(jobIdParamSchema),
  checkPermission(RECRUITER_PERMISSIONS.CAN_POST_JOB),
  validateBody(updateJobStatusSchema),
  jobController.updateJobStatus
);

router.patch(
  '/:id/archive',
  validateParams(jobIdParamSchema),
  checkPermission(RECRUITER_PERMISSIONS.CAN_POST_JOB),
  jobController.archiveJob
);

router.patch(
  '/:id/restore',
  validateParams(jobIdParamSchema),
  checkPermission(RECRUITER_PERMISSIONS.CAN_POST_JOB),
  jobController.restoreArchivedJob
);

router.delete(
  '/:id',
  validateParams(jobIdParamSchema),
  checkPermission(RECRUITER_PERMISSIONS.CAN_POST_JOB),
  jobController.deleteJob
);

module.exports = router;
