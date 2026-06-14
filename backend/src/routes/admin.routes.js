'use strict';

const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireAdmin = require('../middleware/requireAdmin');
const { validateQuery } = require('../middleware/validateQuery');
const { validateParams } = require('../middleware/validateParams');
const { validateBody } = require('../middleware/validate');
const adminController = require('../controllers/admin.controller');
const {
  listUsersQuerySchema,
  listJobsQuerySchema,
  listApplicationsQuerySchema,
  userIdParamsSchema,
  jobIdParamsSchema,
  applicationIdParamsSchema,
  companyIdParamsSchema,
  createUserBodySchema,
  updateUserBodySchema,
  setPasswordBodySchema,
  banUserBodySchema,
  updateJobStatusBodySchema,
  updateSubscriptionPolicySchema,
  updateCompanySubscriptionSchema,
  listCatalogQuerySchema,
  listInstitutionOfferingsQuerySchema,
  catalogIdParamsSchema,
  adminCreateTrainingCenterSchema,
  adminUpdateTrainingCenterSchema,
  adminCreatePrivateInstitutionSchema,
  adminUpdatePrivateInstitutionSchema,
} = require('../validators/admin.validator');
const { updateCatalogStatusSchema } = require('../validators/publicCatalog.validator');
const {
  adminListOfferingsQuerySchema,
  adminOfferingStatusSchema,
  offeringIdParamsSchema,
} = require('../validators/catalogOfferings.validator');
const catalogOfferingsController = require('../controllers/catalogOfferings.controller');
const subscriptionPaymentController = require('../controllers/subscriptionPayment.controller');
const {
  listPaymentRequestsQuerySchema,
  paymentRequestIdParamsSchema,
  reviewPaymentRequestSchema,
} = require('../validators/subscriptionPayment.validator');

const router = express.Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/stats', adminController.getStats);
router.get('/subscription-policy', adminController.getSubscriptionPolicy);
router.patch(
  '/subscription-policy',
  validateBody(updateSubscriptionPolicySchema),
  adminController.updateSubscriptionPolicy
);
router.get(
  '/subscription-payment-requests',
  validateQuery(listPaymentRequestsQuerySchema),
  subscriptionPaymentController.adminListPaymentRequests
);
router.patch(
  '/subscription-payment-requests/:id',
  validateParams(paymentRequestIdParamsSchema),
  validateBody(reviewPaymentRequestSchema),
  subscriptionPaymentController.adminReviewPaymentRequest
);

router.get('/users', validateQuery(listUsersQuerySchema), adminController.listUsers);
router.post('/users', validateBody(createUserBodySchema), adminController.createUser);
router.get(
  '/users/:id',
  validateParams(userIdParamsSchema),
  adminController.getUser
);
router.patch(
  '/users/:id',
  validateParams(userIdParamsSchema),
  validateBody(updateUserBodySchema),
  adminController.updateUser
);
router.post(
  '/users/:id/password',
  validateParams(userIdParamsSchema),
  validateBody(setPasswordBodySchema),
  adminController.setUserPassword
);
router.post(
  '/users/:id/ban',
  validateParams(userIdParamsSchema),
  validateBody(banUserBodySchema),
  adminController.banUser
);
router.post(
  '/users/:id/unban',
  validateParams(userIdParamsSchema),
  adminController.unbanUser
);
router.delete(
  '/users/:id',
  validateParams(userIdParamsSchema),
  adminController.deleteUser
);
router.get(
  '/users/:id/login-events',
  validateParams(userIdParamsSchema),
  validateQuery(listUsersQuerySchema.pick({ page: true, limit: true })),
  adminController.listUserLoginEvents
);

router.get('/jobs', validateQuery(listJobsQuerySchema), adminController.listJobs);
router.get(
  '/jobs/:id',
  validateParams(jobIdParamsSchema),
  adminController.getJob
);
router.patch(
  '/jobs/:id/status',
  validateParams(jobIdParamsSchema),
  validateBody(updateJobStatusBodySchema),
  adminController.updateJobStatus
);
router.delete(
  '/jobs/:id',
  validateParams(jobIdParamsSchema),
  adminController.deleteJob
);

router.get(
  '/applications',
  validateQuery(listApplicationsQuerySchema),
  adminController.listApplications
);
router.get(
  '/applications/:id',
  validateParams(applicationIdParamsSchema),
  adminController.getApplication
);

router.get('/companies', validateQuery(listUsersQuerySchema.pick({ page: true, limit: true, search: true })), adminController.listCompanies);
router.get(
  '/companies/:id',
  validateParams(companyIdParamsSchema),
  adminController.getCompany
);
router.patch(
  '/companies/:id/subscription',
  validateParams(companyIdParamsSchema),
  validateBody(updateCompanySubscriptionSchema),
  adminController.updateCompanySubscription
);

router.get(
  '/training-centers',
  validateQuery(listCatalogQuerySchema),
  adminController.listTrainingCenters
);
router.post(
  '/training-centers',
  validateBody(adminCreateTrainingCenterSchema),
  adminController.createTrainingCenter
);
router.get(
  '/training-centers/:id',
  validateParams(catalogIdParamsSchema),
  adminController.getTrainingCenter
);
router.patch(
  '/training-centers/:id',
  validateParams(catalogIdParamsSchema),
  validateBody(adminUpdateTrainingCenterSchema),
  adminController.updateTrainingCenter
);
router.patch(
  '/training-centers/:id/status',
  validateParams(catalogIdParamsSchema),
  validateBody(updateCatalogStatusSchema),
  adminController.updateTrainingCenterStatus
);
router.get(
  '/private-institutions',
  validateQuery(listCatalogQuerySchema),
  adminController.listPrivateInstitutions
);
router.post(
  '/private-institutions',
  validateBody(adminCreatePrivateInstitutionSchema),
  adminController.createPrivateInstitution
);
router.get(
  '/private-institutions/:id',
  validateParams(catalogIdParamsSchema),
  adminController.getPrivateInstitution
);
router.patch(
  '/private-institutions/:id',
  validateParams(catalogIdParamsSchema),
  validateBody(adminUpdatePrivateInstitutionSchema),
  adminController.updatePrivateInstitution
);
router.patch(
  '/private-institutions/:id/status',
  validateParams(catalogIdParamsSchema),
  validateBody(updateCatalogStatusSchema),
  adminController.updatePrivateInstitutionStatus
);
router.get(
  '/private-institution-offerings',
  validateQuery(listInstitutionOfferingsQuerySchema),
  adminController.listInstitutionOfferings
);
router.patch(
  '/private-institution-offerings/:id/status',
  validateParams(offeringIdParamsSchema),
  validateBody(adminOfferingStatusSchema),
  adminController.updateInstitutionOfferingStatus
);

router.get(
  '/training-formations',
  validateQuery(adminListOfferingsQuerySchema),
  catalogOfferingsController.adminListFormations
);
router.patch(
  '/training-formations/:id/status',
  validateParams(offeringIdParamsSchema),
  validateBody(adminOfferingStatusSchema),
  catalogOfferingsController.adminSetFormationStatus
);
router.get(
  '/training-events',
  validateQuery(adminListOfferingsQuerySchema),
  catalogOfferingsController.adminListEvents
);
router.patch(
  '/training-events/:id/status',
  validateParams(offeringIdParamsSchema),
  validateBody(adminOfferingStatusSchema),
  catalogOfferingsController.adminSetEventStatus
);

module.exports = router;
