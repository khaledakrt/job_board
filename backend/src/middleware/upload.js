'use strict';

const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const multer = require('multer');
const { LOGO_UPLOAD, CATALOG_BROCHURE_UPLOAD, CATALOG_IMAGE_UPLOAD } = require('../config/constants');
const { generateUuid } = require('../utils/uuid');
const {
  getLogoDirectory,
  ensureLogoDirectory,
  getBrochureDirectory,
  ensureBrochureDirectory,
  ensureCatalogImageDirectory,
  getCatalogImageDirectory,
} = require('../utils/fileStorage');
const ApiError = require('../utils/ApiError');
const { matchesFileSignature } = require('../utils/fileSignature');

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

    return validateUploadedSignature(req.file, 'Le logo ne correspond pas à une image valide', next);
  });
}

const brochureStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureBrochureDirectory();
      cb(null, getBrochureDirectory());
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const filename = `${generateUuid()}.pdf`;
    cb(null, filename);
  },
});

function brochureFileFilter(req, file, cb) {
  if (!CATALOG_BROCHURE_UPLOAD.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error('Seuls les fichiers PDF sont acceptés'), false);
  }
  return cb(null, true);
}

const brochureUpload = multer({
  storage: brochureStorage,
  fileFilter: brochureFileFilter,
  limits: {
    fileSize: CATALOG_BROCHURE_UPLOAD.MAX_FILE_SIZE_BYTES,
    files: 1,
  },
});

function uploadProviderLogo(req, res, next) {
  companyLogoUpload.single('logo')(req, res, (err) => {
    if (err) return next(err);
    if (!req.file) return next(ApiError.badRequest('Fichier logo requis'));
    return validateUploadedSignature(req.file, 'Le logo ne correspond pas à une image valide', next);
  });
}

function uploadProviderBrochure(req, res, next) {
  brochureUpload.single('brochure')(req, res, (err) => {
    if (err) return next(err);
    if (!req.file) return next(ApiError.badRequest('Fichier PDF requis'));
    return validateUploadedSignature(req.file, 'La brochure ne correspond pas à un PDF valide', next);
  });
}

const catalogImageStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureCatalogImageDirectory();
      cb(null, getCatalogImageDirectory());
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const extension = MIME_TO_EXTENSION[file.mimetype];
    if (!extension) {
      return cb(new Error('Invalid file type. Only JPG, PNG, and WEBP are allowed.'));
    }
    cb(null, `${generateUuid()}${extension}`);
  },
});

const catalogImageUpload = multer({
  storage: catalogImageStorage,
  fileFilter,
  limits: {
    fileSize: CATALOG_IMAGE_UPLOAD.MAX_FILE_SIZE_BYTES,
    files: CATALOG_IMAGE_UPLOAD.MAX_GALLERY_FILES,
  },
});

function uploadCatalogImage(req, res, next) {
  catalogImageUpload.single('image')(req, res, (err) => {
    if (err) return next(err);
    if (!req.file) return next(ApiError.badRequest('Image requise'));
    return validateUploadedSignature(req.file, 'L’image ne correspond pas à un fichier valide', next);
  });
}

function uploadCatalogGallery(req, res, next) {
  catalogImageUpload.array('images', CATALOG_IMAGE_UPLOAD.MAX_GALLERY_FILES)(req, res, (err) => {
    if (err) return next(err);
    if (!req.files?.length) return next(ApiError.badRequest('Au moins une image requise'));
    return validateUploadedSignatures(req.files, 'Une image ne correspond pas à un fichier valide', next);
  });
}

async function validateUploadedSignature(file, message, next) {
  try {
    const isValid = await matchesFileSignature(file.path, file.mimetype);
    if (!isValid) {
      await fsp.unlink(file.path).catch(() => undefined);
      return next(ApiError.badRequest(message));
    }
    return next();
  } catch (error) {
    await fsp.unlink(file.path).catch(() => undefined);
    return next(error);
  }
}

async function validateUploadedSignatures(files, message, next) {
  try {
    for (const file of files) {
      const isValid = await matchesFileSignature(file.path, file.mimetype);
      if (!isValid) {
        await Promise.all(files.map((item) => fsp.unlink(item.path).catch(() => undefined)));
        return next(ApiError.badRequest(message));
      }
    }
    return next();
  } catch (error) {
    await Promise.all(files.map((item) => fsp.unlink(item.path).catch(() => undefined)));
    return next(error);
  }
}

module.exports = {
  uploadCompanyLogo,
  companyLogoUpload,
  uploadProviderLogo,
  uploadProviderBrochure,
  uploadCatalogImage,
  uploadCatalogGallery,
};
