'use strict';

const express = require('express');
const controller = require('../controllers/candidateJobAlert.controller');
const authenticate = require('../middleware/authenticate');
const { requireCandidateRole } = require('../middleware/authorize');
const { requireCandidate, requireCandidateProfile } = require('../middleware/requireCandidate');
const { validateBody } = require('../middleware/validate');
const { validateParams } = require('../middleware/validateParams');
const { z } = require('zod');

const router = express.Router();

router.use(authenticate, requireCandidateRole);

router.get('/', requireCandidate, controller.list);

router.use(requireCandidateProfile);
router.post(
  '/',
  validateBody(z.object({ searchFilters: z.record(z.unknown()) })),
  controller.create
);
router.delete(
  '/:id',
  validateParams(z.object({ id: z.string().uuid() })),
  controller.remove
);

module.exports = router;
