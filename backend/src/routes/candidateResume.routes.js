'use strict';

const express = require('express');
const candidateResumeController = require('../controllers/candidateResume.controller');
const authenticate = require('../middleware/authenticate');
const { requireCandidateRole } = require('../middleware/authorize');
const { requireCandidate } = require('../middleware/requireCandidate');
const { uploadCandidateResume } = require('../middleware/candidateUpload');
const { handleMulterError } = require('../utils/fileStorage');

const router = express.Router();

router.use(authenticate);
router.use(requireCandidateRole);
router.use(requireCandidate);

router.post(
  '/parse',
  uploadCandidateResume,
  (err, req, res, next) => handleMulterError(err, req, res, next, 'resume'),
  candidateResumeController.parseResume
);

router.post('/generate-pdf', candidateResumeController.generateResumePdf);

module.exports = router;
