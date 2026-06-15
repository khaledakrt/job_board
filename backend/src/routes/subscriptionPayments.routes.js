'use strict';

const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRecruiter = require('../middleware/requireRecruiter');
const { requireCompanyOwner } = require('../middleware/checkPermission');
const { validateBody } = require('../middleware/validate');
const {
  createPaymentRequestSchema,
} = require('../validators/subscriptionPayment.validator');
const controller = require('../controllers/subscriptionPayment.controller');

const router = express.Router();

router.use(authenticate);
router.use(requireRecruiter);

router.get('/overview', controller.getOverview);
router.post(
  '/payment-requests',
  requireCompanyOwner,
  validateBody(createPaymentRequestSchema),
  controller.createPaymentRequest
);

module.exports = router;
