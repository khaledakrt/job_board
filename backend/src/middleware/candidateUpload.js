'use strict';

const path = require('path');
const fs = require('fs/promises');
const multer = require('multer');
const {
  RESUME_UPLOAD,
  AVATAR_UPLOAD,
} = require('../config/constants');
const { generateUuid } = require('../utils/uuid');
const {
  getResumeDirectory,
  getAvatarDirectory,
  ensureResumeDirectory,
  ensureAvatarDirectory,
} = require('../utils/fileStorage');
const ApiError = require('../utils/ApiError');
const { matchesFileSignature } = require('../utils/fileSignature');

const RESUME_MIME_TO_EXTENSION = {
  'application/pdf': '.pdf',
};

const AVATAR_MIME_TO_EXTENSION = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const resumeStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureResumeDirectory();
      cb(null, getResumeDirectory());
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const extension = RESUME_MIME_TO_EXTENSION[file.mimetype];

    if (!extension) {
      return cb(new Error('Invalid file type. Only PDF resumes are allowed.'));
    }

    cb(null, `${generateUuid()}${extension}`);
  },
});

function resumeFileFilter(req, file, cb) {
  if (!RESUME_UPLOAD.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Only PDF resumes are allowed.'), false);
  }

  const extension = path.extname(file.originalname).toLowerCase();

  if (extension !== '.pdf') {
    return cb(new Error('Invalid file extension. Only PDF resumes are allowed.'), false);
  }

  return cb(null, true);
}

const resumeUpload = multer({
  storage: resumeStorage,
  fileFilter: resumeFileFilter,
  limits: {
    fileSize: RESUME_UPLOAD.MAX_FILE_SIZE_BYTES,
    files: 1,
  },
});

const avatarStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureAvatarDirectory();
      cb(null, getAvatarDirectory());
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const extension = AVATAR_MIME_TO_EXTENSION[file.mimetype];

    if (!extension) {
      return cb(new Error('Invalid file type. Only JPG, PNG, and WEBP images are allowed.'));
    }

    cb(null, `${generateUuid()}${extension}`);
  },
});

function avatarFileFilter(req, file, cb) {
  if (!AVATAR_UPLOAD.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Only JPG, PNG, and WEBP images are allowed.'), false);
  }

  const extension = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  if (!allowedExtensions.includes(extension)) {
    return cb(
      new Error('Invalid file extension. Only JPG, PNG, and WEBP images are allowed.'),
      false
    );
  }

  return cb(null, true);
}

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: AVATAR_UPLOAD.MAX_FILE_SIZE_BYTES,
    files: 1,
  },
});

function uploadCandidateResume(req, res, next) {
  resumeUpload.single('resume')(req, res, (err) => {
    if (err) {
      return next(err);
    }

    if (!req.file) {
      return next(ApiError.badRequest('Resume PDF file is required'));
    }

    return validateUploadedSignature(req.file, 'Le fichier CV ne correspond pas à un PDF valide', next);
  });
}

function uploadCandidateAvatar(req, res, next) {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (err) {
      return next(err);
    }

    if (!req.file) {
      return next(ApiError.badRequest('Avatar image file is required'));
    }

    return validateUploadedSignature(req.file, 'La photo ne correspond pas à une image valide', next);
  });
}

async function validateUploadedSignature(file, message, next) {
  try {
    const isValid = await matchesFileSignature(file.path, file.mimetype);
    if (!isValid) {
      await fs.unlink(file.path).catch(() => undefined);
      return next(ApiError.badRequest(message));
    }
    return next();
  } catch (error) {
    await fs.unlink(file.path).catch(() => undefined);
    return next(error);
  }
}

module.exports = {
  uploadCandidateResume,
  uploadCandidateAvatar,
  resumeUpload,
  avatarUpload,
};
