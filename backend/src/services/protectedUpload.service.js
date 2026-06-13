'use strict';

const path = require('path');
const { Op } = require('sequelize');
const { Application, CandidateProfile, Job, RecruiterProfile } = require('../models');
const {
  COMPANY_ROLES,
  USER_ROLES,
  RESUME_UPLOAD,
  CV_SNAPSHOT_UPLOAD,
} = require('../config/constants');
const {
  getResumeDirectory,
  getSnapshotDirectory,
} = require('../utils/fileStorage');
const ApiError = require('../utils/ApiError');

function assertSafeFilename(filename) {
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw ApiError.badRequest('Invalid file name');
  }
}

function uploadMarker(kind, filename) {
  const subdir = kind === 'snapshot' ? CV_SNAPSHOT_UPLOAD.SUBDIRECTORY : RESUME_UPLOAD.SUBDIRECTORY;
  return `%/uploads/${subdir}/${filename}`;
}

async function assertCandidateCanAccess({ userId, kind, filename }) {
  if (kind === 'resume') {
    const profile = await CandidateProfile.findOne({
      where: {
        user_id: userId,
        resume_url: { [Op.like]: uploadMarker(kind, filename) },
      },
      attributes: ['id'],
    });
    if (profile) return true;
  }

  const application = await Application.findOne({
    where: {
      ...(kind === 'snapshot'
        ? { resume_snapshot_url: { [Op.like]: uploadMarker(kind, filename) } }
        : {}),
    },
    include: [
      {
        model: CandidateProfile,
        as: 'candidate',
        where: {
          user_id: userId,
          ...(kind === 'resume' ? { resume_url: { [Op.like]: uploadMarker(kind, filename) } } : {}),
        },
        required: true,
        attributes: ['id'],
      },
    ],
    attributes: ['id'],
  });

  return Boolean(application);
}

async function assertRecruiterCanAccess({ userId, kind, filename }) {
  if (kind === 'resume') {
    return false;
  }

  const recruiter = await RecruiterProfile.findOne({
    where: { user_id: userId },
    attributes: ['id', 'company_id', 'company_role', 'can_decide_application'],
  });
  if (!recruiter?.company_id) return false;
  if (
    recruiter.company_role !== COMPANY_ROLES.OWNER &&
    recruiter.can_decide_application !== true
  ) {
    return false;
  }

  const application = await Application.findOne({
    where: kind === 'snapshot'
      ? { resume_snapshot_url: { [Op.like]: uploadMarker(kind, filename) } }
      : {},
    include: [
      {
        model: Job,
        as: 'job',
        where: { company_id: recruiter.company_id },
        required: true,
        attributes: ['id'],
      },
    ],
    attributes: ['id'],
  });

  return Boolean(application);
}

async function resolveProtectedUpload({ user, kind, filename }) {
  assertSafeFilename(filename);

  const allowed =
    user.role === USER_ROLES.ADMIN ||
    (user.role === USER_ROLES.CANDIDATE &&
      (await assertCandidateCanAccess({ userId: user.id, kind, filename }))) ||
    (user.role === USER_ROLES.RECRUITER &&
      (await assertRecruiterCanAccess({ userId: user.id, kind, filename })));

  if (!allowed) {
    throw ApiError.forbidden('You do not have access to this file');
  }

  const directory = kind === 'snapshot' ? getSnapshotDirectory() : getResumeDirectory();
  return {
    filePath: path.join(directory, filename),
    contentType: 'application/pdf',
  };
}

module.exports = {
  resolveProtectedUpload,
};
