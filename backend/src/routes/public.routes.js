'use strict';

const express = require('express');
const publicController = require('../controllers/public.controller');
const { validateBody } = require('../middleware/validate');
const { contactFormRateLimiter } = require('../config');
const { contactFormSchema } = require('../validators/public.validator');

const router = express.Router();

router.post(
  '/contact',
  contactFormRateLimiter,
  validateBody(contactFormSchema),
  publicController.submitContact
);

module.exports = router;
