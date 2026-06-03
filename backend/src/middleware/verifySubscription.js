'use strict';

const ApiError = require('../utils/ApiError');
const subscriptionService = require('../services/subscription.service');

async function verifySubscription(req, res, next) {
  try {
    const companyId = req.companyId || req.params.id;

    if (!companyId) {
      throw ApiError.badRequest('Company context is required for subscription verification');
    }

    const isActive = await subscriptionService.verifyActiveSubscription(companyId);

    if (!isActive) {
      throw ApiError.forbidden(
        'An active company subscription is required to perform this action'
      );
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = verifySubscription;
