'use strict';

const { CandidateProfile, User } = require('../models');
const { USER_ROLES } = require('../config/constants');
const ApiError = require('../utils/ApiError');
const { generateUuid } = require('../utils/uuid');
const {
  buildResumePublicUrl,
  buildAvatarPublicUrl,
  deleteResumeFile,
  deleteAvatarFile,
} = require('../utils/fileStorage');
const { generateResumePdfFile } = require('./resumePdfGenerator.service');

function formatProfile(profile) {
  return {
    id: profile.id,
    userId: profile.user_id,
    email: profile.user?.email,
    firstName: profile.first_name,
    lastName: profile.last_name,
    phone: profile.phone,
    avatarUrl: profile.avatar_url,
    professionalTitle: profile.professional_title,
    bio: profile.bio,
    skills: profile.skills,
    experiences: profile.experiences,
    education: profile.education,
    resumeUrl: profile.resume_url,
    minSalary: profile.min_salary,
    updatedAt: profile.updated_at,
  };
}

async function getProfileByUserId(userId) {
  const profile = await CandidateProfile.findOne({
    where: { user_id: userId },
    include: [{ model: User, as: 'user', attributes: ['id', 'email'] }],
  });

  if (!profile) {
    throw ApiError.notFound('Candidate profile not found');
  }

  return formatProfile(profile);
}

async function createProfile({ userId, payload }) {
  const user = await User.findByPk(userId);

  if (!user || user.role !== USER_ROLES.CANDIDATE) {
    throw ApiError.forbidden('Only candidate accounts can create a profile');
  }

  const existing = await CandidateProfile.findOne({ where: { user_id: userId } });

  if (existing) {
    throw ApiError.conflict('Candidate profile already exists');
  }

  const profile = await CandidateProfile.create({
    id: generateUuid(),
    user_id: userId,
    first_name: payload.firstName || null,
    last_name: payload.lastName || null,
    phone: payload.phone || null,
    avatar_url: null,
    professional_title: payload.professionalTitle || null,
    bio: payload.bio || null,
    skills: payload.skills || null,
    experiences: payload.experiences || null,
    education: payload.education || null,
    resume_url: null,
    min_salary: payload.minSalary ?? null,
    updated_at: new Date(),
  });

  const full = await CandidateProfile.findByPk(profile.id, {
    include: [{ model: User, as: 'user', attributes: ['id', 'email'] }],
  });

  return formatProfile(full);
}

async function updateProfile({ userId, payload }) {
  const profile = await CandidateProfile.findOne({ where: { user_id: userId } });

  if (!profile) {
    throw ApiError.notFound('Candidate profile not found');
  }

  await profile.update({
    first_name: payload.firstName ?? profile.first_name,
    last_name: payload.lastName ?? profile.last_name,
    phone: payload.phone ?? profile.phone,
    professional_title: payload.professionalTitle ?? profile.professional_title,
    bio: payload.bio ?? profile.bio,
    skills: payload.skills ?? profile.skills,
    experiences: payload.experiences ?? profile.experiences,
    education: payload.education ?? profile.education,
    min_salary: payload.minSalary ?? profile.min_salary,
    updated_at: new Date(),
  });

  const full = await CandidateProfile.findByPk(profile.id, {
    include: [{ model: User, as: 'user', attributes: ['id', 'email'] }],
  });

  return formatProfile(full);
}

async function deleteProfile(userId) {
  const profile = await CandidateProfile.findOne({ where: { user_id: userId } });

  if (!profile) {
    throw ApiError.notFound('Candidate profile not found');
  }

  if (profile.resume_url) {
    await deleteResumeFile(profile.resume_url);
  }

  if (profile.avatar_url) {
    await deleteAvatarFile(profile.avatar_url);
  }

  await profile.destroy();

  return { message: 'Candidate profile deleted successfully' };
}

async function updateAvatar({ userId, file }) {
  const profile = await CandidateProfile.findOne({ where: { user_id: userId } });

  if (!profile) {
    throw ApiError.notFound('Candidate profile not found');
  }

  const previousAvatarUrl = profile.avatar_url;
  const newAvatarUrl = buildAvatarPublicUrl(file.filename);

  await profile.update({
    avatar_url: newAvatarUrl,
    updated_at: new Date(),
  });

  if (previousAvatarUrl) {
    await deleteAvatarFile(previousAvatarUrl);
  }

  const full = await CandidateProfile.findByPk(profile.id, {
    include: [{ model: User, as: 'user', attributes: ['id', 'email'] }],
  });

  return formatProfile(full);
}

async function saveResumeFileOnly({ userId, file }) {
  const profile = await CandidateProfile.findOne({ where: { user_id: userId } });

  if (!profile) {
    throw ApiError.notFound('Candidate profile not found');
  }

  const previousResumeUrl = profile.resume_url;
  const newResumeUrl = buildResumePublicUrl(file.filename);

  await profile.update({
    resume_url: newResumeUrl,
    updated_at: new Date(),
  });

  if (previousResumeUrl) {
    await deleteResumeFile(previousResumeUrl);
  }

  return profile;
}

async function saveResumeFromUpload({ userId, file, parsedData }) {
  const profile = await CandidateProfile.findOne({ where: { user_id: userId } });

  if (!profile) {
    throw ApiError.notFound('Candidate profile not found');
  }

  const previousResumeUrl = profile.resume_url;
  const newResumeUrl = buildResumePublicUrl(file.filename);

  const updatePayload = {
    resume_url: newResumeUrl,
    first_name: parsedData.first_name ?? profile.first_name,
    last_name: parsedData.last_name ?? profile.last_name,
    phone: parsedData.phone ?? profile.phone,
    professional_title: parsedData.professional_title ?? profile.professional_title,
    skills: parsedData.skills ?? profile.skills,
    updated_at: new Date(),
  };

  if (parsedData.experiences?.length) {
    updatePayload.experiences = parsedData.experiences;
  }
  if (parsedData.education?.length) {
    updatePayload.education = parsedData.education;
  }

  await profile.update(updatePayload);

  if (previousResumeUrl) {
    await deleteResumeFile(previousResumeUrl);
  }

  return profile;
}

async function generateResumePdfFromProfile(userId) {
  const profile = await CandidateProfile.findOne({
    where: { user_id: userId },
    include: [{ model: User, as: 'user', attributes: ['id', 'email'] }],
  });

  if (!profile) {
    throw ApiError.notFound('Candidate profile not found');
  }

  const profileData = formatProfile(profile);
  const generated = await generateResumePdfFile(profileData);

  const previousResumeUrl = profile.resume_url;

  await profile.update({
    resume_url: generated.resumeUrl,
    updated_at: new Date(),
  });

  if (previousResumeUrl && previousResumeUrl !== generated.resumeUrl) {
    await deleteResumeFile(previousResumeUrl);
  }

  const full = await CandidateProfile.findByPk(profile.id, {
    include: [{ model: User, as: 'user', attributes: ['id', 'email'] }],
  });

  return formatProfile(full);
}

module.exports = {
  getProfileByUserId,
  createProfile,
  updateProfile,
  deleteProfile,
  updateAvatar,
  saveResumeFileOnly,
  saveResumeFromUpload,
  generateResumePdfFromProfile,
  formatProfile,
};
