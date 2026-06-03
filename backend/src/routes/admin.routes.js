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
  userIdParamsSchema,
  jobIdParamsSchema,
  createUserBodySchema,
  updateUserBodySchema,
  setPasswordBodySchema,
  banUserBodySchema,
  updateJobStatusBodySchema,
} = require('../validators/admin.validator');

const router = express.Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/stats', adminController.getStats);

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

router.get('/companies', validateQuery(listUsersQuerySchema.pick({ page: true, limit: true, search: true })), adminController.listCompanies);

module.exports = router;
