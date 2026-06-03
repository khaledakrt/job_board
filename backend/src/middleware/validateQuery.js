'use strict';

const ApiError = require('../utils/ApiError');

function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(ApiError.badRequest('Invalid query parameters', errors));
    }

    req.validatedQuery = result.data;
    return next();
  };
}

module.exports = { validateQuery };
