'use strict';

const express = require('express');
const controller = require('../controllers/candidateSavedJob.controller');
const authenticate = require('../middleware/authenticate');
const { requireCandidateRole } = require('../middleware/authorize');
const { requireCandidate, requireCandidateProfile } = require('../middleware/requireCandidate');
const { validateBody } = require('../middleware/validate');
const { validateParams } = require('../middleware/validateParams');
const { z } = require('zod');

const router = express.Router();

router.use(authenticate, requireCandidateRole, requireCandidate);

router.get('/', controller.list);

router.use(requireCandidateProfile);
router.post('/', validateBody(z.object({ jobId: z.string().uuid() })), controller.save);
router.delete(
  '/:id',
  validateParams(z.object({ id: z.string().uuid() })),
  controller.remove
);

module.exports = router;
