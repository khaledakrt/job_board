'use strict';

const { Op } = require('sequelize');
const sequelize = require('../database/sequelize');
const { env } = require('../config');
const {
  Company,
  RecruiterProfile,
  SubscriptionPaymentRequest,
  SubscriptionPlan,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { generateUuid } = require('../utils/uuid');
const subscriptionService = require('./subscription.service');

const PAYMENT_STATUSES = Object.freeze({
  PENDING: 'pending',
  PAYMENT_PENDING: 'payment_pending',
  PAID: 'paid',
  REJECTED: 'rejected',
  FAILED: 'failed',
  CANCELED: 'canceled',
});

function formatPlan(plan) {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    priceTnd: Number(plan.price_tnd),
    durationMonths: plan.duration_months,
    maxActiveJobs: plan.max_active_jobs,
    isActive: Boolean(plan.is_active),
    sortOrder: plan.sort_order,
  };
}

function formatPaymentRequest(request) {
  return {
    id: request.id,
    companyId: request.company_id,
    companyName: request.company?.name ?? null,
    plan: request.plan ? formatPlan(request.plan) : null,
    provider: request.provider,
    status: request.status,
    amountTnd: Number(request.amount_tnd),
    currency: request.currency,
    paymentUrl: request.provider_payment_url,
    providerPaymentRef: request.provider_payment_ref,
    payerEmail: request.payer_email,
    payerPhone: request.payer_phone,
    adminNote: request.admin_note,
    paidAt: request.paid_at,
    reviewedAt: request.reviewed_at,
    createdAt: request.created_at,
    updatedAt: request.updated_at,
  };
}

async function listActivePlans() {
  const plans = await SubscriptionPlan.findAll({
    where: { is_active: true },
    order: [['sort_order', 'ASC'], ['price_tnd', 'ASC']],
  });
  return plans.map(formatPlan);
}

async function getRecruiterCompany(userId) {
  const recruiter = await RecruiterProfile.findOne({
    where: { user_id: userId },
    include: [{ model: Company, as: 'company' }],
  });

  if (!recruiter?.company_id) {
    throw ApiError.forbidden('Recruiter company profile is required');
  }

  return recruiter.company;
}

function konnectConfigured() {
  return Boolean(env.KONNECT_API_KEY && env.KONNECT_WALLET_ID);
}

function konnectMethods() {
  return String(env.KONNECT_ACCEPTED_METHODS || '')
    .split(',')
    .map((method) => method.trim())
    .filter(Boolean);
}

async function initKonnectPayment({ request, plan, company }) {
  if (!konnectConfigured()) {
    throw ApiError.badRequest('Online payment is not configured yet');
  }

  const baseUrl = env.KONNECT_API_BASE_URL.replace(/\/$/, '');
  const amountInMillimes = Math.round(Number(plan.price_tnd) * 1000);
  const webhookUrl = `${env.API_PUBLIC_URL.replace(/\/$/, '')}${env.API_PREFIX}/subscriptions/payments/konnect/webhook`;
  const successUrl = `${env.CLIENT_URL.replace(/\/$/, '')}/recruiter/subscription?payment=success`;
  const failUrl = `${env.CLIENT_URL.replace(/\/$/, '')}/recruiter/subscription?payment=failed`;

  const response = await fetch(`${baseUrl}/payments/init-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.KONNECT_API_KEY,
    },
    body: JSON.stringify({
      receiverWalletId: env.KONNECT_WALLET_ID,
      token: 'TND',
      amount: amountInMillimes,
      type: 'immediate',
      description: `${plan.name} - ${company.name}`,
      acceptedPaymentMethods: konnectMethods(),
      lifespan: env.KONNECT_PAYMENT_LIFESPAN_MINUTES,
      checkoutForm: true,
      addPaymentFeesToAmount: false,
      email: company.contact_email || undefined,
      phoneNumber: company.contact_phone || undefined,
      orderId: request.id,
      webhook: webhookUrl,
      silentWebhook: true,
      successUrl,
      failUrl,
      theme: 'light',
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw ApiError.badRequest(body.message || 'Payment initialization failed');
  }

  const paymentUrl = body.payUrl || body.paymentUrl || body.payment_url;
  const paymentRef = body.paymentRef || body.payment_ref || body.payment?.id || body.payment;
  if (!paymentUrl) {
    throw ApiError.badRequest('Payment provider did not return a payment URL');
  }

  await request.update({
    status: PAYMENT_STATUSES.PAYMENT_PENDING,
    provider_payment_url: paymentUrl,
    provider_payment_ref: paymentRef || null,
    updated_at: new Date(),
  });

  return request.reload({ include: includePaymentRequest() });
}

function includePaymentRequest() {
  return [
    { model: SubscriptionPlan, as: 'plan' },
    { model: Company, as: 'company', attributes: ['id', 'name', 'contact_email', 'contact_phone'] },
  ];
}

async function createRecruiterPaymentRequest(userId, payload) {
  const mode = await subscriptionService.getRecruiterSubscriptionMode();
  if (mode === subscriptionService.SUBSCRIPTION_MODES.FREE_ALL) {
    throw ApiError.badRequest('Subscriptions are not required while global free mode is active');
  }

  const company = await getRecruiterCompany(userId);
  const active = await subscriptionService.verifyActiveSubscription(company.id);
  if (active) {
    throw ApiError.badRequest('Your company already has an active subscription');
  }

  const plan = await SubscriptionPlan.findOne({
    where: { id: payload.planId, is_active: true },
  });
  if (!plan) {
    throw ApiError.notFound('Subscription plan not found');
  }

  const existing = await SubscriptionPaymentRequest.findOne({
    where: {
      company_id: company.id,
      status: { [Op.in]: [PAYMENT_STATUSES.PENDING, PAYMENT_STATUSES.PAYMENT_PENDING] },
    },
    include: includePaymentRequest(),
    order: [['created_at', 'DESC']],
  });
  if (existing?.provider_payment_url) {
    return formatPaymentRequest(existing);
  }

  const request = await SubscriptionPaymentRequest.create({
    id: generateUuid(),
    company_id: company.id,
    plan_id: plan.id,
    provider: payload.provider || 'konnect',
    status: PAYMENT_STATUSES.PENDING,
    amount_tnd: plan.price_tnd,
    currency: 'TND',
    payer_email: payload.payerEmail || company.contact_email || null,
    payer_phone: payload.payerPhone || company.contact_phone || null,
    created_at: new Date(),
    updated_at: new Date(),
  });

  if ((payload.provider || 'konnect') === 'konnect') {
    const initialized = await initKonnectPayment({ request, plan, company });
    return formatPaymentRequest(initialized);
  }

  return formatPaymentRequest(await request.reload({ include: includePaymentRequest() }));
}

async function getRecruiterSubscriptionOverview(userId) {
  const company = await getRecruiterCompany(userId);
  const [mode, subscription, plans, latestPayment] = await Promise.all([
    subscriptionService.getRecruiterSubscriptionMode(),
    subscriptionService.getCompanySubscription(company.id),
    listActivePlans(),
    SubscriptionPaymentRequest.findOne({
      where: { company_id: company.id },
      include: includePaymentRequest(),
      order: [['created_at', 'DESC']],
    }),
  ]);

  return {
    mode,
    company: { id: company.id, name: company.name },
    subscription,
    canPublish: mode === subscriptionService.SUBSCRIPTION_MODES.FREE_ALL || subscription.isActive,
    plans: mode === subscriptionService.SUBSCRIPTION_MODES.PAID_REQUIRED ? plans : [],
    latestPaymentRequest: latestPayment ? formatPaymentRequest(latestPayment) : null,
    onlinePaymentConfigured: konnectConfigured(),
  };
}

async function adminListPaymentRequests(query = {}) {
  const where = {};
  if (query.status) where.status = query.status;

  const rows = await SubscriptionPaymentRequest.findAll({
    where,
    include: includePaymentRequest(),
    order: [['created_at', 'DESC']],
    limit: query.limit || 50,
  });

  return rows.map(formatPaymentRequest);
}

async function approvePaymentRequest(requestId, { adminId, adminNote } = {}) {
  return sequelize.transaction(async (transaction) => {
    const request = await SubscriptionPaymentRequest.findByPk(requestId, {
      include: includePaymentRequest(),
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!request) throw ApiError.notFound('Payment request not found');

    if (request.status === PAYMENT_STATUSES.PAID) {
      return {
        paymentRequest: formatPaymentRequest(request),
        subscription: await subscriptionService.getCompanySubscription(request.company_id),
      };
    }

    if (![PAYMENT_STATUSES.PENDING, PAYMENT_STATUSES.PAYMENT_PENDING].includes(request.status)) {
      throw ApiError.badRequest('Cette demande de paiement ne peut plus être approuvée.');
    }

    const subscription = await subscriptionService.grantManualSubscription(request.company_id, {
      planType: request.plan.code,
      months: request.plan.duration_months,
      transaction,
    });

    await request.update({
      status: PAYMENT_STATUSES.PAID,
      admin_note: adminNote || null,
      paid_at: request.paid_at || new Date(),
      reviewed_at: new Date(),
      reviewed_by: adminId || null,
      updated_at: new Date(),
    }, { transaction });

    return {
      paymentRequest: formatPaymentRequest(await request.reload({ include: includePaymentRequest(), transaction })),
      subscription,
    };
  });
}

async function handleKonnectWebhook(paymentRef) {
  if (!paymentRef) {
    throw ApiError.badRequest('Missing payment reference');
  }
  if (!konnectConfigured()) {
    throw ApiError.badRequest('Online payment is not configured yet');
  }

  const request = await SubscriptionPaymentRequest.findOne({
    where: { provider: 'konnect', provider_payment_ref: paymentRef },
    include: includePaymentRequest(),
  });
  if (!request) {
    throw ApiError.notFound('Payment request not found');
  }
  if (request.status === PAYMENT_STATUSES.PAID) {
    return formatPaymentRequest(request);
  }

  const baseUrl = env.KONNECT_API_BASE_URL.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/payments/${encodeURIComponent(paymentRef)}`, {
    headers: { 'x-api-key': env.KONNECT_API_KEY },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw ApiError.badRequest(body.message || 'Payment verification failed');
  }

  const payment = body.payment || body;
  if (payment.status === 'completed') {
    const result = await approvePaymentRequest(request.id, {
      adminNote: 'Paiement validé automatiquement par webhook Konnect.',
    });
    return result.paymentRequest;
  }

  if (payment.status === 'failed' || payment.status === 'canceled') {
    await request.update({
      status: payment.status === 'failed' ? PAYMENT_STATUSES.FAILED : PAYMENT_STATUSES.CANCELED,
      updated_at: new Date(),
    });
    return formatPaymentRequest(await request.reload({ include: includePaymentRequest() }));
  }

  return formatPaymentRequest(request);
}

async function rejectPaymentRequest(requestId, { adminId, adminNote } = {}) {
  const request = await SubscriptionPaymentRequest.findByPk(requestId, {
    include: includePaymentRequest(),
  });
  if (!request) throw ApiError.notFound('Payment request not found');

  await request.update({
    status: PAYMENT_STATUSES.REJECTED,
    admin_note: adminNote || null,
    reviewed_at: new Date(),
    reviewed_by: adminId || null,
    updated_at: new Date(),
  });

  return formatPaymentRequest(await request.reload({ include: includePaymentRequest() }));
}

module.exports = {
  PAYMENT_STATUSES,
  listActivePlans,
  createRecruiterPaymentRequest,
  getRecruiterSubscriptionOverview,
  adminListPaymentRequests,
  approvePaymentRequest,
  handleKonnectWebhook,
  rejectPaymentRequest,
};
