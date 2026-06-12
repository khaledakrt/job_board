'use strict';

const fs = require('fs/promises');
const path = require('path');
const { env } = require('../config');
const {
  LOGO_UPLOAD,
  RESUME_UPLOAD,
  AVATAR_UPLOAD,
  CV_SNAPSHOT_UPLOAD,
  CATALOG_BROCHURE_UPLOAD,
  CATALOG_IMAGE_UPLOAD,
} = require('../config/constants');
const ApiError = require('./ApiError');
const logger = require('./logger');

function getUploadRoot() {
  return path.resolve(process.cwd(), env.UPLOAD_DIR);
}

function getDirectoryForSubdir(subdirectory) {
  return path.join(getUploadRoot(), subdirectory);
}

function getLogoDirectory() {
  return getDirectoryForSubdir(LOGO_UPLOAD.SUBDIRECTORY);
}

function getResumeDirectory() {
  return getDirectoryForSubdir(RESUME_UPLOAD.SUBDIRECTORY);
}

function getAvatarDirectory() {
  return getDirectoryForSubdir(AVATAR_UPLOAD.SUBDIRECTORY);
}

function getSnapshotDirectory() {
  return getDirectoryForSubdir(CV_SNAPSHOT_UPLOAD.SUBDIRECTORY);
}

function getBrochureDirectory() {
  return getDirectoryForSubdir(CATALOG_BROCHURE_UPLOAD.SUBDIRECTORY);
}

function getCatalogImageDirectory() {
  return getDirectoryForSubdir(CATALOG_IMAGE_UPLOAD.SUBDIRECTORY);
}

function buildPublicUrl(subdirectory, filename) {
  return `${env.API_PUBLIC_URL}/uploads/${subdirectory}/${filename}`;
}

function buildProtectedUploadUrl(subdirectory, filename) {
  return `${env.API_PUBLIC_URL}/uploads/${subdirectory}/${filename}`;
}

function buildLogoPublicUrl(filename) {
  return buildPublicUrl(LOGO_UPLOAD.SUBDIRECTORY, filename);
}

function buildResumePublicUrl(filename) {
  return buildProtectedUploadUrl(RESUME_UPLOAD.SUBDIRECTORY, filename);
}

function buildAvatarPublicUrl(filename) {
  return buildPublicUrl(AVATAR_UPLOAD.SUBDIRECTORY, filename);
}

function buildSnapshotPublicUrl(filename) {
  return buildProtectedUploadUrl(CV_SNAPSHOT_UPLOAD.SUBDIRECTORY, filename);
}

function buildBrochurePublicUrl(filename) {
  return buildPublicUrl(CATALOG_BROCHURE_UPLOAD.SUBDIRECTORY, filename);
}

function buildCatalogImagePublicUrl(filename) {
  return buildPublicUrl(CATALOG_IMAGE_UPLOAD.SUBDIRECTORY, filename);
}

function resolveFilePathFromUrl(fileUrl, subdirectory) {
  if (!fileUrl) {
    return null;
  }

  const marker = `/uploads/${subdirectory}/`;
  const index = fileUrl.indexOf(marker);

  if (index === -1) {
    return null;
  }

  const filename = fileUrl.slice(index + marker.length);

  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return null;
  }

  return path.join(getDirectoryForSubdir(subdirectory), filename);
}

async function ensureDirectory(directory) {
  await fs.mkdir(directory, { recursive: true });
}

async function ensureLogoDirectory() {
  await ensureDirectory(getLogoDirectory());
}

async function ensureResumeDirectory() {
  await ensureDirectory(getResumeDirectory());
}

async function ensureAvatarDirectory() {
  await ensureDirectory(getAvatarDirectory());
}

async function ensureSnapshotDirectory() {
  await ensureDirectory(getSnapshotDirectory());
}

async function ensureBrochureDirectory() {
  await ensureDirectory(getBrochureDirectory());
}

async function ensureCatalogImageDirectory() {
  await ensureDirectory(getCatalogImageDirectory());
}

async function deleteFileFromUrl(fileUrl, subdirectory) {
  const filePath = resolveFilePathFromUrl(fileUrl, subdirectory);

  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.warn(`Failed to delete file: ${filePath}`);
    }
  }
}

async function deleteLogoFile(logoUrl) {
  return deleteFileFromUrl(logoUrl, LOGO_UPLOAD.SUBDIRECTORY);
}

async function deleteResumeFile(resumeUrl) {
  return deleteFileFromUrl(resumeUrl, RESUME_UPLOAD.SUBDIRECTORY);
}

async function deleteAvatarFile(avatarUrl) {
  return deleteFileFromUrl(avatarUrl, AVATAR_UPLOAD.SUBDIRECTORY);
}

async function copyResumeToSnapshot(resumeUrl) {
  const sourcePath = resolveFilePathFromUrl(resumeUrl, RESUME_UPLOAD.SUBDIRECTORY);

  if (!sourcePath) {
    throw ApiError.badRequest('Invalid resume file for snapshot');
  }

  await ensureSnapshotDirectory();

  const extension = path.extname(sourcePath) || '.pdf';
  const { generateUuid } = require('./uuid');
  const filename = `${generateUuid()}${extension}`;
  const destinationPath = path.join(getSnapshotDirectory(), filename);

  await fs.copyFile(sourcePath, destinationPath);

  return buildSnapshotPublicUrl(filename);
}

function handleMulterError(err, req, res, next, context = 'file') {
  if (!err) {
    return next();
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    const message =
      context === 'resume'
        ? 'Resume file must be smaller than 10MB'
        : context === 'avatar'
          ? 'Avatar file must be smaller than 2MB'
          : 'File must be smaller than 2MB';
    return next(ApiError.badRequest(message));
  }

  if (err.message && (err.message.includes('Invalid file') || err.message.includes('allowed'))) {
    return next(ApiError.badRequest(err.message));
  }

  return next(err);
}

module.exports = {
  getUploadRoot,
  getLogoDirectory,
  getResumeDirectory,
  getAvatarDirectory,
  getSnapshotDirectory,
  buildLogoPublicUrl,
  buildResumePublicUrl,
  buildAvatarPublicUrl,
  buildSnapshotPublicUrl,
  resolveFilePathFromUrl,
  ensureLogoDirectory,
  ensureResumeDirectory,
  ensureAvatarDirectory,
  ensureSnapshotDirectory,
  ensureBrochureDirectory,
  ensureCatalogImageDirectory,
  buildBrochurePublicUrl,
  buildCatalogImagePublicUrl,
  getBrochureDirectory,
  getCatalogImageDirectory,
  deleteLogoFile,
  deleteResumeFile,
  deleteAvatarFile,
  deleteFileFromUrl,
  copyResumeToSnapshot,
  handleMulterError,
};
