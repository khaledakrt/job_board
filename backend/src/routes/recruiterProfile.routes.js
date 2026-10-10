'use strict';

const express = require('express');
const recruiterProfileController = require('../controllers/recruiterProfile.controller');
const authenticate = require('../middleware/authenticate');
const { requireRecruiterRole } = require('../middleware/authorize');
const requireRecruiter = require('../middleware/requireRecruiter');
const { validateBody } = require('../middleware/validate');
const { updateOwnProfileSchema } = require('../validators/recruiterTeam.validator');

const router = express.Router();

router.use(authenticate);
router.use(requireRecruiterRole);

router.get('/profile', recruiterProfileController.getProfile);
router.patch(
  '/profile',
  requireRecruiter,
  validateBody(updateOwnProfileSchema),
  recruiterProfileController.updateProfile
);
router.get('/summary', recruiterProfileController.getSummary);

module.exports = router;
