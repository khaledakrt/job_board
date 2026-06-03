'use strict';

const ApiError = require('../utils/ApiError');

/**
 * Validates req.body against a Zod schema.
 */
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(ApiError.badRequest('Validation failed', errors));
    }

    req.validatedBody = result.data;
    return next();
  };
}

module.exports = { validateBody };
