'use strict';

const express = require('express');
const controller = require('../controllers/candidateDashboard.controller');
const authenticate = require('../middleware/authenticate');
const { requireCandidateRole } = require('../middleware/authorize');
const { requireCandidate } = require('../middleware/requireCandidate');

const router = express.Router();

router.use(authenticate, requireCandidateRole, requireCandidate);

router.get('/summary', controller.getSummary);
router.get('/recommended-jobs', controller.getRecommended);
router.get('/recruiter-preview', controller.getRecruiterPreview);

module.exports = router;
