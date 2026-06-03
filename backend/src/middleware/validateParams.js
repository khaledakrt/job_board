'use strict';

const ApiError = require('../utils/ApiError');

function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(ApiError.badRequest('Invalid route parameters', errors));
    }

    req.validatedParams = result.data;
    return next();
  };
}

module.exports = { validateParams };
