'use strict';

const express = require('express');
const { z } = require('zod');
const recruiterCandidatesController = require('../controllers/recruiterCandidates.controller');
const authenticate = require('../middleware/authenticate');
const { requireRecruiterRole } = require('../middleware/authorize');
const requireRecruiter = require('../middleware/requireRecruiter');
const { checkPermission } = require('../middleware/checkPermission');
const { validateQuery } = require('../middleware/validateQuery');
const { RECRUITER_PERMISSIONS } = require('../config/constants');

const router = express.Router();

const listQuerySchema = z.object({
  search: z.string().max(120).optional(),
  country: z.string().max(128).optional(),
  skill: z.string().max(80).optional(),
  language: z.string().max(64).optional(),
  title: z.string().max(255).optional(),
  contract: z.string().max(32).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(10).optional(),
});

router.use(authenticate);
router.use(requireRecruiterRole);
router.use(requireRecruiter);

router.get(
  '/',
  checkPermission(RECRUITER_PERMISSIONS.CAN_DECIDE_APPLICATION),
  validateQuery(listQuerySchema),
  recruiterCandidatesController.listCandidates
);

module.exports = router;
