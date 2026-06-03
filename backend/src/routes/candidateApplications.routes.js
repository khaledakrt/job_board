'use strict';

const express = require('express');
const candidateApplicationController = require('../controllers/candidateApplication.controller');
const authenticate = require('../middleware/authenticate');
const { requireCandidateRole } = require('../middleware/authorize');
const { requireCandidateProfile } = require('../middleware/requireCandidate');
const { validateBody } = require('../middleware/validate');
const { validateParams } = require('../middleware/validateParams');
const { z } = require('zod');
const { generateLetterSchema } = require('../validators/candidateProfile.validator');

const router = express.Router();

router.use(authenticate);
router.use(requireCandidateRole);
router.use(requireCandidateProfile);

router.get('/', candidateApplicationController.listMyApplications);

router.get('/applied-job-ids', candidateApplicationController.listAppliedJobIds);

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
