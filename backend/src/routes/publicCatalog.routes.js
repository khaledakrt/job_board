'use strict';

const express = require('express');
const authenticate = require('../middleware/authenticate');
const optionalAuthenticate = require('../middleware/optionalAuthenticate');
const { validateQuery } = require('../middleware/validateQuery');
const { validateParams } = require('../middleware/validateParams');
const { validateBody } = require('../middleware/validate');
const { contactFormRateLimiter } = require('../config');
const publicCatalogController = require('../controllers/publicCatalog.controller');
const catalogOfferingsController = require('../controllers/catalogOfferings.controller');
const {
  listTrainingCentersQuerySchema,
  listInstitutionsQuerySchema,
  idParamsSchema,
  submitTrainingCenterSchema,
  submitPrivateInstitutionSchema,
} = require('../validators/publicCatalog.validator');
const {
  offeringIdParamsSchema,
  centerIdParamsSchema,
  participateBodySchema,
} = require('../validators/catalogOfferings.validator');

const router = express.Router();

router.get(
  '/training-centers',
  validateQuery(listTrainingCentersQuerySchema),
  publicCatalogController.listTrainingCenters
);
router.get(
  '/training-centers/:id',
  validateParams(idParamsSchema),
  publicCatalogController.getTrainingCenter
);
router.post(
  '/training-centers',
  contactFormRateLimiter,
  validateBody(submitTrainingCenterSchema),
  publicCatalogController.submitTrainingCenter
);

router.get(
  '/private-institutions',
  validateQuery(listInstitutionsQuerySchema),
  publicCatalogController.listPrivateInstitutions
);
router.get(
  '/private-institutions/publications/:id',
  validateParams(idParamsSchema),
  publicCatalogController.getInstitutionOffering
);
router.get(
  '/private-institutions/:id',
  validateParams(idParamsSchema),
  publicCatalogController.getPrivateInstitution
);
router.post(
  '/private-institutions',
  contactFormRateLimiter,
  validateBody(submitPrivateInstitutionSchema),
  publicCatalogController.submitPrivateInstitution
);

router.get(
  '/training-centers/:centerId/formations',
  validateParams(centerIdParamsSchema),
  catalogOfferingsController.listCenterFormations
);
router.get(
  '/training-centers/:centerId/events',
  validateParams(centerIdParamsSchema),
  catalogOfferingsController.listCenterEvents
);
router.get(
  '/formations/:id',
  validateParams(offeringIdParamsSchema),
  optionalAuthenticate,
  catalogOfferingsController.getFormation
);
router.get(
  '/events/:id',
  validateParams(offeringIdParamsSchema),
  optionalAuthenticate,
  catalogOfferingsController.getEvent
);
router.post(
  '/formations/:id/participate',
  authenticate,
  validateParams(offeringIdParamsSchema),
  validateBody(participateBodySchema),
  catalogOfferingsController.participateFormation
);
router.post(
  '/events/:id/participate',
  authenticate,
  validateParams(offeringIdParamsSchema),
  validateBody(participateBodySchema),
  catalogOfferingsController.participateEvent
);

module.exports = router;
