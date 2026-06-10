'use strict';

const express = require('express');
const companyController = require('../controllers/company.controller');
const authenticate = require('../middleware/authenticate');
const { requireRecruiterRole } = require('../middleware/authorize');
const requireRecruiter = require('../middleware/requireRecruiter');
const {
  checkPermission,
  requireCompanyOwner,
} = require('../middleware/checkPermission');
const { requireSameCompany } = require('../middleware/companyAccess');
const { validateBody } = require('../middleware/validate');
const { validateParams } = require('../middleware/validateParams');
const { validateQuery } = require('../middleware/validateQuery');
const { uploadCompanyLogo } = require('../middleware/upload');
const { handleMulterError } = require('../utils/fileStorage');
const { RECRUITER_PERMISSIONS } = require('../config/constants');
const { uuidParamSchema } = require('../validators/common.validator');
const {
  createCompanySchema,
  updateCompanySchema,
} = require('../validators/company.validator');

const publicCompanyController = require('../controllers/publicCompany.controller');
const {
  publicCompanyDirectoryQuerySchema,
  publicCompanyQuerySchema,
} = require('../validators/publicCompany.validator');

const router = express.Router();

router.get(
  '/public-directory',
  validateQuery(publicCompanyDirectoryQuerySchema),
  publicCompanyController.listPublicCompanies
);

router.get(
  '/:id/public',
  validateParams(uuidParamSchema),
  validateQuery(publicCompanyQuerySchema),
  publicCompanyController.getPublicProfile
);

router.use(authenticate);
router.use(requireRecruiterRole);

router.get('/', requireRecruiter, companyController.listCompanies);

router.post(
  '/',
  validateBody(createCompanySchema),
  companyController.createCompany
);

router.get(
  '/:id',
  validateParams(uuidParamSchema),
  requireRecruiter,
  requireSameCompany,
  companyController.getCompany
);

router.put(
  '/:id',
  validateParams(uuidParamSchema),
  requireRecruiter,
  requireSameCompany,
  checkPermission(RECRUITER_PERMISSIONS.CAN_EDIT_COMPANY),
  validateBody(updateCompanySchema),
  companyController.updateCompany
);

router.delete(
  '/:id',
  validateParams(uuidParamSchema),
  requireRecruiter,
  requireSameCompany,
  requireCompanyOwner,
  companyController.deleteCompany
);

router.put(
  '/:id/logo',
  validateParams(uuidParamSchema),
  requireRecruiter,
  requireSameCompany,
  checkPermission(RECRUITER_PERMISSIONS.CAN_EDIT_COMPANY),
  uploadCompanyLogo,
  handleMulterError,
  companyController.updateCompanyLogo
);

module.exports = router;
