'use strict';

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { LOGO_UPLOAD } = require('../config/constants');
const { generateUuid } = require('../utils/uuid');
const { getLogoDirectory, ensureLogoDirectory } = require('../utils/fileStorage');
const ApiError = require('../utils/ApiError');

const MIME_TO_EXTENSION = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureLogoDirectory();
      cb(null, getLogoDirectory());
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const extension = MIME_TO_EXTENSION[file.mimetype];

    if (!extension) {
      return cb(new Error('Invalid file type. Only JPG, PNG, and WEBP are allowed.'));
    }

    const filename = `${generateUuid()}${extension}`;
    cb(null, filename);
  },
});

function fileFilter(req, file, cb) {
  if (!LOGO_UPLOAD.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new Error('Invalid file type. Only JPG, PNG, and WEBP are allowed.'),
      false
    );
  }

  const extension = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  if (!allowedExtensions.includes(extension)) {
    return cb(
      new Error('Invalid file extension. Only JPG, PNG, and WEBP are allowed.'),
      false
    );
  }

  return cb(null, true);
}

const companyLogoUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: LOGO_UPLOAD.MAX_FILE_SIZE_BYTES,
    files: 1,
  },
});

function uploadCompanyLogo(req, res, next) {
  const uploadSingle = companyLogoUpload.single('logo');

  uploadSingle(req, res, (err) => {
    if (err) {
      return next(err);
    }

    if (!req.file) {
      return next(ApiError.badRequest('Logo file is required'));
    }

    return next();
  });
}

module.exports = {
  uploadCompanyLogo,
  companyLogoUpload,
};
