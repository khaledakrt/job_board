'use strict';

const { Op } = require('sequelize');
const { env } = require('../config');
const { Subscription } = require('../models');
const { generateUuid } = require('../utils/uuid');

async function verifyActiveSubscription(companyId) {
  if (env.SUBSCRIPTION_MOCK_BYPASS) {
    return true;
  }

  const subscription = await Subscription.findOne({
    where: {
      company_id: companyId,
      status: 'active',
      current_period_end: {
        [Op.gt]: new Date(),
      },
    },
  });

  return Boolean(subscription);
}

async function createMockSubscription(companyId, planType = 'enterprise', options = {}) {
  const periodEnd = new Date();
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const [subscription] = await Subscription.findOrCreate({
    where: { company_id: companyId },
    defaults: {
      id: generateUuid(),
      company_id: companyId,
      plan_type: planType,
      status: 'active',
      current_period_end: periodEnd,
      created_at: new Date(),
      updated_at: new Date(),
    },
    transaction: options.transaction,
  });

  return subscription;
}

module.exports = {
  verifyActiveSubscription,
  createMockSubscription,
};
