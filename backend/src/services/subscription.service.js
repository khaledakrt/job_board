'use strict';

const { Op } = require('sequelize');
const { env } = require('../config');
const { PlatformSetting, Subscription, SubscriptionPlan } = require('../models');
const { generateUuid } = require('../utils/uuid');

const SUBSCRIPTION_MODE_KEY = 'recruiter_subscription_mode';
const SUBSCRIPTION_MODES = Object.freeze({
  FREE_ALL: 'free_all',
  PAID_REQUIRED: 'paid_required',
});
const MANUAL_FREE_PLAN_TYPE = 'manual_free';
const PAID_PLAN_TYPES = Object.freeze(['monthly_50', 'annual_500']);
const PUBLISHABLE_PLAN_TYPES = Object.freeze([MANUAL_FREE_PLAN_TYPE, ...PAID_PLAN_TYPES]);

async function getRecruiterSubscriptionMode() {
  const setting = await PlatformSetting.findByPk(SUBSCRIPTION_MODE_KEY);
  return Object.values(SUBSCRIPTION_MODES).includes(setting?.setting_value)
    ? setting.setting_value
    : SUBSCRIPTION_MODES.PAID_REQUIRED;
}

async function setRecruiterSubscriptionMode(mode) {
  if (!Object.values(SUBSCRIPTION_MODES).includes(mode)) {
    throw new Error('Invalid recruiter subscription mode');
  }

  await PlatformSetting.upsert({
    setting_key: SUBSCRIPTION_MODE_KEY,
    setting_value: mode,
    updated_at: new Date(),
  });

  return { mode };
}

async function cancelManualFreeSubscriptions() {
  const [count] = await Subscription.update(
    {
      status: 'canceled',
      updated_at: new Date(),
    },
    {
      where: {
        plan_type: MANUAL_FREE_PLAN_TYPE,
        status: 'active',
      },
    }
  );

  return count;
}

function formatSubscription(subscription) {
  if (!subscription) {
    return {
      id: null,
      planType: null,
      status: 'missing',
      currentPeriodEnd: null,
      isActive: false,
    };
  }

  const end = subscription.current_period_end;
  const isActive =
    subscription.status === 'active' &&
    PUBLISHABLE_PLAN_TYPES.includes(subscription.plan_type) &&
    end &&
    new Date(end).getTime() > Date.now();
  return {
    id: subscription.id,
    planType: subscription.plan_type,
    status: subscription.status,
    currentPeriodEnd: end,
    isActive: Boolean(isActive),
  };
}

async function verifyActiveSubscription(companyId) {
  if (env.SUBSCRIPTION_MOCK_BYPASS) {
    return true;
  }

  const mode = await getRecruiterSubscriptionMode();
  if (mode === SUBSCRIPTION_MODES.FREE_ALL) {
    return true;
  }

  const subscription = await Subscription.findOne({
    where: {
      company_id: companyId,
      plan_type: {
        [Op.in]: PUBLISHABLE_PLAN_TYPES,
      },
      status: 'active',
      current_period_end: {
        [Op.gt]: new Date(),
      },
    },
  });

  return Boolean(subscription);
}

async function getActivePublishableSubscription(companyId) {
  if (env.SUBSCRIPTION_MOCK_BYPASS) {
    return { subscription: null, plan: null, unlimited: true };
  }

  const mode = await getRecruiterSubscriptionMode();
  if (mode === SUBSCRIPTION_MODES.FREE_ALL) {
    return { subscription: null, plan: null, unlimited: true };
  }

  const subscription = await Subscription.findOne({
    where: {
      company_id: companyId,
      plan_type: {
        [Op.in]: PUBLISHABLE_PLAN_TYPES,
      },
      status: 'active',
      current_period_end: {
        [Op.gt]: new Date(),
      },
    },
  });

  if (!subscription) {
    return { subscription: null, plan: null, unlimited: false };
  }

  const plan = await SubscriptionPlan.findOne({
    where: { code: subscription.plan_type, is_active: true },
  });

  return { subscription, plan, unlimited: plan?.max_active_jobs == null };
}

async function getCompanySubscription(companyId) {
  const subscription = await Subscription.findOne({ where: { company_id: companyId } });
  return formatSubscription(subscription);
}

async function grantManualSubscription(
  companyId,
  { planType = MANUAL_FREE_PLAN_TYPE, months = 12, transaction } = {}
) {
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + Number(months || 12));

  const [subscription, created] = await Subscription.findOrCreate({
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
    transaction,
  });

  if (!created) {
    await subscription.update({
      plan_type: planType,
      status: 'active',
      current_period_end: periodEnd,
      updated_at: new Date(),
    }, { transaction });
  }

  return formatSubscription(subscription);
}

async function cancelCompanySubscription(companyId) {
  const subscription = await Subscription.findOne({
    where: { company_id: companyId, plan_type: MANUAL_FREE_PLAN_TYPE },
  });
  if (!subscription) {
    return getCompanySubscription(companyId);
  }

  await subscription.update({
    status: 'canceled',
    updated_at: new Date(),
  });
  return formatSubscription(subscription);
}

async function createMockSubscription(companyId, planType = MANUAL_FREE_PLAN_TYPE, options = {}) {
  if (env.NODE_ENV === 'production') {
    throw new Error('Mock subscriptions cannot be created in production');
  }

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
  SUBSCRIPTION_MODES,
  MANUAL_FREE_PLAN_TYPE,
  getRecruiterSubscriptionMode,
  setRecruiterSubscriptionMode,
  cancelManualFreeSubscriptions,
  formatSubscription,
  verifyActiveSubscription,
  getActivePublishableSubscription,
  getCompanySubscription,
  grantManualSubscription,
  cancelCompanySubscription,
  createMockSubscription,
};
