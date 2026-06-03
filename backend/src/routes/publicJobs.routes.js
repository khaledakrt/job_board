'use strict';

const express = require('express');
const publicJobsController = require('../controllers/publicJobs.controller');
const candidateApplicationController = require('../controllers/candidateApplication.controller');
const authenticate = require('../middleware/authenticate');
const { requireCandidateRole } = require('../middleware/authorize');
const { requireCandidateProfile } = require('../middleware/requireCandidate');
const { validateParams } = require('../middleware/validateParams');
const { validateQuery } = require('../middleware/validateQuery');
const { validateBody } = require('../middleware/validate');
const { jobIdParamSchema } = require('../validators/common.validator');
const { publicJobSearchQuerySchema } = require('../validators/publicJobSearch.validator');
const { applyToJobSchema } = require('../validators/candidateProfile.validator');

const router = express.Router();

router.get('/', validateQuery(publicJobSearchQuerySchema), publicJobsController.searchJobs);

router.get(
  '/:id',
  validateParams(jobIdParamSchema),
  publicJobsController.getJobById
);

router.post(
  '/:id/apply',
  authenticate,
  requireCandidateRole,
  requireCandidateProfile,
  validateParams(jobIdParamSchema),
  validateBody(applyToJobSchema),
  candidateApplicationController.applyToJob
);

module.exports = router;
