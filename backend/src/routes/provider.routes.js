'use strict';

const express = require('express');
const authenticate = require('../middleware/authenticate');
const {
  requireTrainingProviderRole,
  requireInstitutionProviderRole,
} = require('../middleware/authorize');
const { validateBody } = require('../middleware/validate');
const { validateParams } = require('../middleware/validateParams');
const { validateQuery } = require('../middleware/validateQuery');
const { strictAuthRateLimiter } = require('../config');
const { uploadProviderLogo, uploadProviderBrochure, uploadCatalogImage, uploadCatalogGallery } = require('../middleware/upload');
const providerController = require('../controllers/provider.controller');
const catalogOfferingsController = require('../controllers/catalogOfferings.controller');
const institutionOfferingsController = require('../controllers/institutionOfferings.controller');
const { registerProviderSchema } = require('../validators/provider.validator');
const {
  updateTrainingCenterProfileSchema,
  updateInstitutionProfileSchema,
  courseBodySchema,
  programBodySchema,
  courseIdParamsSchema,
  programIndexParamsSchema,
} = require('../validators/provider.validator');
const {
  formationBodySchema,
  eventBodySchema,
  formationIdParamsSchema,
  eventIdParamsSchema,
  listParticipationsQuerySchema,
  providerListOfferingsQuerySchema,
} = require('../validators/catalogOfferings.validator');
const {
  offeringTypeParamsSchema,
  offeringIdParamsSchema,
  listInstitutionOfferingsQuerySchema,
  institutionOfferingBodySchema,
} = require('../validators/institutionOfferings.validator');

const router = express.Router();

router.post(
  '/register',
  strictAuthRateLimiter,
  validateBody(registerProviderSchema),
  providerController.registerProvider
);

router.use(authenticate);

router.get(
  '/training/dashboard',
  requireTrainingProviderRole,
  providerController.trainingDashboard
);
router.patch(
  '/training/profile',
  requireTrainingProviderRole,
  validateBody(updateTrainingCenterProfileSchema),
  providerController.updateTrainingProfile
);
router.post(
  '/training/logo',
  requireTrainingProviderRole,
  uploadProviderLogo,
  providerController.uploadTrainingLogo
);
router.post(
  '/training/brochure',
  requireTrainingProviderRole,
  uploadProviderBrochure,
  providerController.uploadTrainingBrochure
);
router.get(
  '/training/courses',
  requireTrainingProviderRole,
  providerController.listTrainingCourses
);
router.post(
  '/training/courses',
  requireTrainingProviderRole,
  validateBody(courseBodySchema),
  providerController.createTrainingCourse
);
router.patch(
  '/training/courses/:courseId',
  requireTrainingProviderRole,
  validateParams(courseIdParamsSchema),
  validateBody(courseBodySchema.partial()),
  providerController.updateTrainingCourse
);
router.delete(
  '/training/courses/:courseId',
  requireTrainingProviderRole,
  validateParams(courseIdParamsSchema),
  providerController.deleteTrainingCourse
);

router.post(
  '/training/catalog-images',
  requireTrainingProviderRole,
  uploadCatalogImage,
  catalogOfferingsController.uploadCatalogImages
);
router.post(
  '/training/catalog-gallery',
  requireTrainingProviderRole,
  uploadCatalogGallery,
  catalogOfferingsController.uploadCatalogImages
);
router.get(
  '/training/participations',
  requireTrainingProviderRole,
  validateQuery(listParticipationsQuerySchema),
  catalogOfferingsController.listProviderParticipations
);
router.get(
  '/training/formations',
  requireTrainingProviderRole,
  validateQuery(providerListOfferingsQuerySchema),
  catalogOfferingsController.listProviderFormations
);
router.get(
  '/training/formations/:formationId',
  requireTrainingProviderRole,
  validateParams(formationIdParamsSchema),
  catalogOfferingsController.getProviderFormation
);
router.post(
  '/training/formations',
  requireTrainingProviderRole,
  validateBody(formationBodySchema),
  catalogOfferingsController.createProviderFormation
);
router.patch(
  '/training/formations/:formationId',
  requireTrainingProviderRole,
  validateParams(formationIdParamsSchema),
  validateBody(formationBodySchema.partial()),
  catalogOfferingsController.updateProviderFormation
);
router.delete(
  '/training/formations/:formationId',
  requireTrainingProviderRole,
  validateParams(formationIdParamsSchema),
  catalogOfferingsController.deleteProviderFormation
);
router.get(
  '/training/events',
  requireTrainingProviderRole,
  validateQuery(providerListOfferingsQuerySchema),
  catalogOfferingsController.listProviderEvents
);
router.get(
  '/training/events/:eventId',
  requireTrainingProviderRole,
  validateParams(eventIdParamsSchema),
  catalogOfferingsController.getProviderEvent
);
router.post(
  '/training/events',
  requireTrainingProviderRole,
  validateBody(eventBodySchema),
  catalogOfferingsController.createProviderEvent
);
router.patch(
  '/training/events/:eventId',
  requireTrainingProviderRole,
  validateParams(eventIdParamsSchema),
  validateBody(eventBodySchema.partial()),
  catalogOfferingsController.updateProviderEvent
);
router.delete(
  '/training/events/:eventId',
  requireTrainingProviderRole,
  validateParams(eventIdParamsSchema),
  catalogOfferingsController.deleteProviderEvent
);

router.get(
  '/institution/dashboard',
  requireInstitutionProviderRole,
  providerController.institutionDashboard
);
router.patch(
  '/institution/profile',
  requireInstitutionProviderRole,
  validateBody(updateInstitutionProfileSchema),
  providerController.updateInstitutionProfile
);
router.post(
  '/institution/logo',
  requireInstitutionProviderRole,
  uploadProviderLogo,
  providerController.uploadInstitutionLogo
);
router.post(
  '/institution/brochure',
  requireInstitutionProviderRole,
  uploadProviderBrochure,
  providerController.uploadInstitutionBrochure
);
router.get(
  '/institution/programs',
  requireInstitutionProviderRole,
  providerController.listInstitutionPrograms
);
router.post(
  '/institution/programs',
  requireInstitutionProviderRole,
  validateBody(programBodySchema),
  providerController.addInstitutionProgram
);
router.patch(
  '/institution/programs/:index',
  requireInstitutionProviderRole,
  validateParams(programIndexParamsSchema),
  validateBody(programBodySchema.partial()),
  providerController.updateInstitutionProgram
);
router.delete(
  '/institution/programs/:index',
  requireInstitutionProviderRole,
  validateParams(programIndexParamsSchema),
  providerController.deleteInstitutionProgram
);

router.get(
  '/institution/offerings',
  requireInstitutionProviderRole,
  validateQuery(listInstitutionOfferingsQuerySchema),
  institutionOfferingsController.listProviderOfferings
);
router.get(
  '/institution/offerings/:offeringId',
  requireInstitutionProviderRole,
  validateParams(offeringIdParamsSchema),
  institutionOfferingsController.getProviderOffering
);
router.post(
  '/institution/offerings/:offeringType',
  requireInstitutionProviderRole,
  validateParams(offeringTypeParamsSchema),
  validateBody(institutionOfferingBodySchema),
  institutionOfferingsController.createProviderOffering
);
router.patch(
  '/institution/offerings/:offeringId',
  requireInstitutionProviderRole,
  validateParams(offeringIdParamsSchema),
  validateBody(institutionOfferingBodySchema.partial()),
  institutionOfferingsController.updateProviderOffering
);
router.delete(
  '/institution/offerings/:offeringId',
  requireInstitutionProviderRole,
  validateParams(offeringIdParamsSchema),
  institutionOfferingsController.deleteProviderOffering
);

module.exports = router;
