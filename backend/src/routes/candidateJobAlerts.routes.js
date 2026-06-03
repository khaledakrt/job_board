'use strict';

const express = require('express');
const controller = require('../controllers/candidateJobAlert.controller');
const authenticate = require('../middleware/authenticate');
const { requireCandidateRole } = require('../middleware/authorize');
const { requireCandidateProfile } = require('../middleware/requireCandidate');
const { validateBody } = require('../middleware/validate');
const { validateParams } = require('../middleware/validateParams');
const { z } = require('zod');

const router = express.Router();

router.use(authenticate, requireCandidateRole, requireCandidateProfile);

router.get('/', controller.list);
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
