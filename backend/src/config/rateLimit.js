'use strict';

const rateLimit = require('express-rate-limit');
const { createClient } = require('redis');
const { RedisStore } = require('rate-limit-redis');

let redisClient;

function getRedisClient(env) {
  if (!redisClient) {
    redisClient = createClient({ url: env.REDIS_URL });
    redisClient.on('error', (error) => {
      console.error('Redis rate limit store error:', error.message);
    });
    redisClient.connect().catch((error) => {
      console.error('Redis rate limit store connection failed:', error.message);
    });
  }

  return redisClient;
}

function createRateLimitStore(env, prefix) {
  if (env.RATE_LIMIT_STORE !== 'redis') {
    return undefined;
  }

  const client = getRedisClient(env);
  return new RedisStore({
    prefix: `jobboard:${prefix}:`,
    sendCommand: (...args) => client.sendCommand(args),
  });
}

function createLimiter(env, prefix, options) {
  const store = createRateLimitStore(env, prefix);
  return rateLimit({
    ...options,
    ...(store ? { store } : {}),
  });
}

function isDevelopment(env) {
  return env.NODE_ENV === 'development';
}

function createGlobalRateLimiter(env) {
  const max = isDevelopment(env)
    ? Math.max(env.GLOBAL_RATE_LIMIT_MAX, 500)
    : env.GLOBAL_RATE_LIMIT_MAX;

  return createLimiter(env, 'global', {
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

  return createLimiter(env, 'auth-strict', {
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

  return createLimiter(env, 'auth-moderate', {
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

function createRefreshRateLimiter(env) {
  const max = isDevelopment(env) ? 120 : 60;
  const windowMs = isDevelopment(env) ? 60_000 : env.AUTH_RATE_LIMIT_WINDOW_MS;

  return createLimiter(env, 'auth-refresh', {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Trop de renouvellements de session. Réessayez dans quelques minutes.',
    },
  });
}

function createContactFormRateLimiter(env) {
  const max = isDevelopment(env) ? 30 : 5;
  const windowMs = isDevelopment(env) ? 60_000 : 900_000;

  return createLimiter(env, 'contact', {
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
  createRefreshRateLimiter,
  createContactFormRateLimiter,
};
