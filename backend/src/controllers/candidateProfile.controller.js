'use strict';

const candidateProfileService = require('../services/candidateProfile.service');
const asyncHandler = require('../utils/asyncHandler');

const getProfile = asyncHandler(async (req, res) => {
  const profile = await candidateProfileService.getProfileByUserId(req.user.id);

  res.status(200).json({
    success: true,
    data: profile,
  });
});

const createProfile = asyncHandler(async (req, res) => {
  const profile = await candidateProfileService.createProfile({
    userId: req.user.id,
    payload: req.validatedBody,
  });

  res.status(201).json({
    success: true,
    message: 'Candidate profile created successfully',
    data: profile,
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const profile = await candidateProfileService.updateProfile({
    userId: req.user.id,
    payload: req.validatedBody,
  });

  res.status(200).json({
    success: true,
    message: 'Candidate profile updated successfully',
    data: profile,
  });
});

const deleteProfile = asyncHandler(async (req, res) => {
  const result = await candidateProfileService.deleteProfile(req.user.id);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

const updateAvatar = asyncHandler(async (req, res) => {
  const profile = await candidateProfileService.updateAvatar({
    userId: req.user.id,
    file: req.file,
  });

  res.status(200).json({
    success: true,
    message: 'Avatar updated successfully',
    data: profile,
  });
});

module.exports = {
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  updateAvatar,
};
