'use strict';

const ApiError = require('../utils/ApiError');
const { USER_ROLES } = require('../config/constants');

function requireAdmin(req, res, next) {
  if (!req.user) {
    return next(ApiError.unauthorized());
  }
  if (req.user.role !== USER_ROLES.ADMIN) {
    return next(ApiError.forbidden('Admin access required'));
  }
  return next();
}

module.exports = requireAdmin;
