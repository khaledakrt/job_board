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
const createAlertSchema = z.object({
  searchFilters: z.record(z.unknown()),
  label: z.string().trim().max(120).optional().nullable(),
  frequency: z.enum(['weekly', 'monthly']).optional(),
  isActive: z.boolean().optional(),
});

const updateAlertSchema = z.object({
  searchFilters: z.record(z.unknown()).optional(),
  label: z.string().trim().max(120).optional().nullable(),
  frequency: z.enum(['weekly', 'monthly']).optional(),
  isActive: z.boolean().optional(),
});

router.post('/', validateBody(createAlertSchema), controller.create);
router.patch(
  '/:id',
  validateParams(z.object({ id: z.string().uuid() })),
  validateBody(updateAlertSchema),
  controller.update
);
router.delete(
  '/:id',
  validateParams(z.object({ id: z.string().uuid() })),
  controller.remove
);

module.exports = router;
