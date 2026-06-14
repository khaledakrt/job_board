'use strict';

const { z } = require('zod');

const createPaymentRequestSchema = z.object({
  planId: z.string().uuid(),
  provider: z.enum(['konnect']).optional().default('konnect'),
  payerEmail: z.string().trim().email().max(255).optional(),
  payerPhone: z.string().trim().max(64).optional(),
});

const listPaymentRequestsQuerySchema = z.object({
  status: z
    .enum(['pending', 'payment_pending', 'paid', 'rejected', 'failed', 'canceled'])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const paymentRequestIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const reviewPaymentRequestSchema = z.object({
  action: z.enum(['approve', 'reject']),
  adminNote: z.string().trim().max(1000).optional(),
});

module.exports = {
  createPaymentRequestSchema,
  listPaymentRequestsQuerySchema,
  paymentRequestIdParamsSchema,
  reviewPaymentRequestSchema,
};
