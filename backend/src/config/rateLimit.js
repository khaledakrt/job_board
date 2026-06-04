'use strict';

const rateLimit = require('express-rate-limit');

function isDevelopment(env) {
  return env.NODE_ENV === 'development';
}

function createGlobalRateLimiter(env) {
  const max = isDevelopment(env)
    ? Math.max(env.GLOBAL_RATE_LIMIT_MAX, 500)
    : env.GLOBAL_RATE_LIMIT_MAX;

  return rateLimit({
    windowMs: env.GLOBAL_RATE_LIMIT_WINDOW_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Trop de requêtes. Réessayez plus tard.',
    },
  });
}

/**
 * Login / register — failed attempts count; successes are skipped.
 */
function createStrictAuthRateLimiter(env) {
  const max = isDevelopment(env)
    ? Math.max(env.AUTH_RATE_LIMIT_MAX, 30)
    : env.AUTH_RATE_LIMIT_MAX;

  const windowMs = isDevelopment(env) ? 60_000 : env.AUTH_RATE_LIMIT_WINDOW_MS;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
      success: false,
      message:
        'Trop de tentatives de connexion. Patientez quelques minutes avant de réessayer.',
    },
  });
}

/**
 * Forgot/reset password, change password/email — separate budget from login.
 */
function createModerateAuthRateLimiter(env) {
  const max = isDevelopment(env) ? 50 : 20;
  const windowMs = isDevelopment(env) ? 60_000 : env.AUTH_RATE_LIMIT_WINDOW_MS;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Trop de requêtes sur cette action. Réessayez dans quelques minutes.',
    },
  });
}

function createContactFormRateLimiter(env) {
  const max = isDevelopment(env) ? 30 : 5;
  const windowMs = isDevelopment(env) ? 60_000 : 900_000;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Trop de messages envoyés. Réessayez dans quelques minutes.',
    },
  });
}

module.exports = {
  createGlobalRateLimiter,
  createStrictAuthRateLimiter,
  createModerateAuthRateLimiter,
  createContactFormRateLimiter,
};
