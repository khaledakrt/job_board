'use strict';

const { Op } = require('sequelize');
const { env } = require('../config');
const { PlatformSetting, Subscription, SubscriptionPlan, RecruiterProfile } = require('../models');
const { generateUuid } = require('../utils/uuid');

const SUBSCRIPTION_MODE_KEY = 'recruiter_subscription_mode';
const SUBSCRIPTION_MODES = Object.freeze({
  FREE_ALL: 'free_all',
  PAID_REQUIRED: 'paid_required',
});
const PAYMENT_OVERRIDES = Object.freeze({
  INHERIT: 'inherit',
  FREE: 'free',
  REQUIRED: 'required',
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

async function getRecruiterPaymentOverride(userId) {
  if (!userId) return PAYMENT_OVERRIDES.INHERIT;
  const profile = await RecruiterProfile.findOne({
    where: { user_id: userId },
    attributes: ['payment_override'],
  });
  const value = profile?.payment_override;
  return Object.values(PAYMENT_OVERRIDES).includes(value) ? value : PAYMENT_OVERRIDES.INHERIT;
}

async function setRecruiterPaymentOverride(userId, mode) {
  if (!Object.values(PAYMENT_OVERRIDES).includes(mode)) {
    throw new Error('Invalid recruiter payment override');
  }

  const profile = await RecruiterProfile.findOne({ where: { user_id: userId } });
  if (!profile) return null;

  await profile.update({
    payment_override: mode,
    updated_at: new Date(),
  });

  return mode;
}

async function findActivePublishableSubscription(companyId) {
  if (!companyId) return null;
  return Subscription.findOne({
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
}

async function resolvePublicationAccess(companyId, userId = null) {
  const [mode, override] = await Promise.all([
    getRecruiterSubscriptionMode(),
    getRecruiterPaymentOverride(userId),
  ]);

  if (
    override === PAYMENT_OVERRIDES.FREE ||
    (override !== PAYMENT_OVERRIDES.REQUIRED && mode === SUBSCRIPTION_MODES.FREE_ALL)
  ) {
    return {
      canPublish: true,
      unlimited: true,
      subscription: null,
      plan: null,
      mode,
      override,
      reason: override === PAYMENT_OVERRIDES.FREE ? 'user_free' : 'free_global',
    };
  }

  const subscription = await findActivePublishableSubscription(companyId);
  if (!subscription) {
    return {
      canPublish: false,
      unlimited: false,
      subscription: null,
      plan: null,
      mode,
      override,
      reason: 'company_subscription_required',
    };
  }

  const plan = await SubscriptionPlan.findOne({
    where: { code: subscription.plan_type, is_active: true },
  });

  return {
    canPublish: true,
    unlimited: plan?.max_active_jobs == null,
    subscription,
    plan,
    mode,
    override,
    reason: 'company_subscription_active',
  };
}

async function verifyActiveSubscription(companyId, userId = null) {
  if (env.SUBSCRIPTION_MOCK_BYPASS && !userId) {
    return true;
  }

  const access = await resolvePublicationAccess(companyId, userId);
  return access.canPublish;
}

async function getActivePublishableSubscription(companyId, userId = null) {
  if (env.SUBSCRIPTION_MOCK_BYPASS && !userId) {
    return { subscription: null, plan: null, unlimited: true };
  }

  const access = await resolvePublicationAccess(companyId, userId);
  return {
    subscription: access.subscription,
    plan: access.plan,
    unlimited: access.unlimited,
  };
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
  PAYMENT_OVERRIDES,
  MANUAL_FREE_PLAN_TYPE,
  getRecruiterSubscriptionMode,
  setRecruiterSubscriptionMode,
  getRecruiterPaymentOverride,
  setRecruiterPaymentOverride,
  resolvePublicationAccess,
  cancelManualFreeSubscriptions,
  formatSubscription,
  verifyActiveSubscription,
  getActivePublishableSubscription,
  getCompanySubscription,
  grantManualSubscription,
  cancelCompanySubscription,
  createMockSubscription,
};

