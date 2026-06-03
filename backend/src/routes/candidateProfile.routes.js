'use strict';

const express = require('express');
const candidateProfileController = require('../controllers/candidateProfile.controller');
const authenticate = require('../middleware/authenticate');
const { requireCandidateRole } = require('../middleware/authorize');
const { requireCandidateProfile } = require('../middleware/requireCandidate');
const { validateBody } = require('../middleware/validate');
const { uploadCandidateAvatar } = require('../middleware/candidateUpload');
const { handleMulterError } = require('../utils/fileStorage');
const {
  createProfileSchema,
  updateProfileSchema,
} = require('../validators/candidateProfile.validator');

const router = express.Router();

router.use(authenticate);
router.use(requireCandidateRole);

router.post(
  '/',
  validateBody(createProfileSchema),
  candidateProfileController.createProfile
);

router.get('/', requireCandidateProfile, candidateProfileController.getProfile);

router.put(
  '/',
  requireCandidateProfile,
  validateBody(updateProfileSchema),
  candidateProfileController.updateProfile
);

router.delete('/', requireCandidateProfile, candidateProfileController.deleteProfile);

router.put(
  '/avatar',
  requireCandidateProfile,
  uploadCandidateAvatar,
  (err, req, res, next) => handleMulterError(err, req, res, next, 'avatar'),
  candidateProfileController.updateAvatar
);

module.exports = router;
