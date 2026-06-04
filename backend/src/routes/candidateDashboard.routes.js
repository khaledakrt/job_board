'use strict';

const express = require('express');
const controller = require('../controllers/candidateDashboard.controller');
const authenticate = require('../middleware/authenticate');
const { requireCandidateRole } = require('../middleware/authorize');
const { requireCandidateProfile } = require('../middleware/requireCandidate');

const router = express.Router();

router.use(authenticate, requireCandidateRole, requireCandidateProfile);

router.get('/summary', controller.getSummary);
router.get('/recommended-jobs', controller.getRecommended);
router.get('/recruiter-preview', controller.getRecruiterPreview);

module.exports = router;
