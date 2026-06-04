'use strict';

require('dotenv').config();

const { loadEnv } = require('./env');
const { buildDatabaseConfig } = require('./database');
const { createCorsOptions } = require('./cors');
const {
  createGlobalRateLimiter,
  createStrictAuthRateLimiter,
  createModerateAuthRateLimiter,
  createContactFormRateLimiter,
} = require('./rateLimit');

const env = loadEnv();
const databaseConfig = buildDatabaseConfig(env);
const corsOptions = createCorsOptions(env.CLIENT_URL);
const globalRateLimiter = createGlobalRateLimiter(env);
const strictAuthRateLimiter = createStrictAuthRateLimiter(env);
const moderateAuthRateLimiter = createModerateAuthRateLimiter(env);
const contactFormRateLimiter = createContactFormRateLimiter(env);

module.exports = {
  env,
  databaseConfig,
  corsOptions,
  globalRateLimiter,
  strictAuthRateLimiter,
  moderateAuthRateLimiter,
  contactFormRateLimiter,
};
