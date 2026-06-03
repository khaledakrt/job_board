'use strict';

/**
 * Restrictive CORS: single allowed origin, credentials enabled for refresh cookies.
 */
function createCorsOptions(clientUrl) {
  const allowedOrigin = clientUrl.replace(/\/$/, '');

  return {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (origin === allowedOrigin) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: [],
    maxAge: 600,
    optionsSuccessStatus: 204,
  };
}

module.exports = { createCorsOptions };
