'use strict';

const express = require('express');
const recruiterProfileController = require('../controllers/recruiterProfile.controller');
const authenticate = require('../middleware/authenticate');
const { requireRecruiterRole } = require('../middleware/authorize');
const requireRecruiter = require('../middleware/requireRecruiter');

const router = express.Router();

router.use(authenticate);
router.use(requireRecruiterRole);
router.use(requireRecruiter);

router.get('/profile', recruiterProfileController.getProfile);

module.exports = router;
