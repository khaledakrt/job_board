'use strict';

const express = require('express');
const authController = require('../controllers/auth.controller');
const { validateBody } = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const { strictAuthRateLimiter, moderateAuthRateLimiter } = require('../config');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  changeEmailSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} = require('../validators/auth.validator');

const router = express.Router();

router.post(
  '/register',
  strictAuthRateLimiter,
  validateBody(registerSchema),
  authController.register
);

router.post('/login', strictAuthRateLimiter, validateBody(loginSchema), authController.login);

router.post('/refresh', authController.refresh);

router.post(
  '/verify-email',
  moderateAuthRateLimiter,
  validateBody(verifyEmailSchema),
  authController.verifyEmail
);

router.post(
  '/resend-verification',
  moderateAuthRateLimiter,
  validateBody(resendVerificationSchema),
  authController.resendVerification
);

router.post(
  '/forgot-password',
  moderateAuthRateLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  moderateAuthRateLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword
);

router.post(
  '/change-password',
  authenticate,
  moderateAuthRateLimiter,
  validateBody(changePasswordSchema),
  authController.changePassword
);

router.post(
  '/change-email',
  authenticate,
  moderateAuthRateLimiter,
  validateBody(changeEmailSchema),
  authController.changeEmail
);

module.exports = router;
