'use strict';

const { CandidateProfile, User, Application } = require('../models');
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
    languages: profile.languages,
    certifications: profile.certifications,
    linkedinUrl: profile.linkedin_url,
    portfolioUrl: profile.portfolio_url,
    experiences: profile.experiences,
    education: profile.education,
    resumeUrl: profile.resume_url,
    minSalary: profile.min_salary,
    jobPreferences: profile.job_preferences,
    notificationPreferences: profile.notification_preferences,
    onboardingCompletedAt: profile.onboarding_completed_at,
    updatedAt: profile.updated_at,
  };
}

function valueFromPayload(payload, key, currentValue) {
  return Object.prototype.hasOwnProperty.call(payload, key) ? payload[key] : currentValue;
}

async function getProfileByUserId(userId) {
  const profile = await CandidateProfile.findOne({
    where: { user_id: userId },
    include: [{ model: User, as: 'user', attributes: ['id', 'email'] }],
  });

  if (!profile) {
    return null;
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
    languages: payload.languages || null,
    certifications: payload.certifications || null,
    linkedin_url: payload.linkedinUrl || null,
    portfolio_url: payload.portfolioUrl || null,
    experiences: payload.experiences || null,
    education: payload.education || null,
    resume_url: null,
    min_salary: payload.minSalary ?? null,
    job_preferences: payload.jobPreferences || null,
    notification_preferences: payload.notificationPreferences || null,
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
    first_name: valueFromPayload(payload, 'firstName', profile.first_name),
    last_name: valueFromPayload(payload, 'lastName', profile.last_name),
    phone: valueFromPayload(payload, 'phone', profile.phone),
    professional_title: valueFromPayload(payload, 'professionalTitle', profile.professional_title),
    bio: valueFromPayload(payload, 'bio', profile.bio),
    skills: valueFromPayload(payload, 'skills', profile.skills),
    languages: valueFromPayload(payload, 'languages', profile.languages),
    certifications: valueFromPayload(payload, 'certifications', profile.certifications),
    linkedin_url: valueFromPayload(payload, 'linkedinUrl', profile.linkedin_url),
    portfolio_url: valueFromPayload(payload, 'portfolioUrl', profile.portfolio_url),
    experiences: valueFromPayload(payload, 'experiences', profile.experiences),
    education: valueFromPayload(payload, 'education', profile.education),
    min_salary: valueFromPayload(payload, 'minSalary', profile.min_salary),
    job_preferences: valueFromPayload(payload, 'jobPreferences', profile.job_preferences),
    notification_preferences: valueFromPayload(
      payload,
      'notificationPreferences',
      profile.notification_preferences
    ),
    onboarding_completed_at:
      payload.onboardingCompleted === true
        ? new Date()
        : payload.onboardingCompleted === false
          ? null
          : profile.onboarding_completed_at,
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

  const applicationsCount = await Application.count({ where: { candidate_id: profile.id } });
  if (applicationsCount > 0) {
    throw ApiError.badRequest(
      'Profile deletion is blocked because this candidate has application history.'
    );
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
