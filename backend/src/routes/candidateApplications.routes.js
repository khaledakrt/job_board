'use strict';

const express = require('express');
const candidateApplicationController = require('../controllers/candidateApplication.controller');
const authenticate = require('../middleware/authenticate');
const { requireCandidateRole } = require('../middleware/authorize');
const { requireCandidate, requireCandidateProfile } = require('../middleware/requireCandidate');
const { validateBody } = require('../middleware/validate');
const { validateParams } = require('../middleware/validateParams');
const { validateQuery } = require('../middleware/validateQuery');
const { z } = require('zod');
const { generateLetterSchema } = require('../validators/candidateProfile.validator');

const router = express.Router();

router.use(authenticate);
router.use(requireCandidateRole);

const listMyApplicationsQuerySchema = z.object({
  scope: z.enum(['active', 'archived', 'all']).optional(),
  status: z.enum(['applied', 'screening', 'interview', 'offer', 'rejected']).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(25).optional(),
});

router.get(
  '/',
  requireCandidate,
  validateQuery(listMyApplicationsQuerySchema),
  candidateApplicationController.listMyApplications
);

router.get('/applied-job-ids', requireCandidate, candidateApplicationController.listAppliedJobIds);

router.use(requireCandidateProfile);

const applicationIdSchema = z.object({ id: z.string().uuid() });

router.get(
  '/:id',
  validateParams(applicationIdSchema),
  candidateApplicationController.getApplicationDetail
);

router.post(
  '/generate-letter',
  validateBody(generateLetterSchema),
  candidateApplicationController.generateCoverLetter
);

module.exports = router;
