'use strict';

const { z } = require('zod');
const {
  TRAINING_DELIVERY_MODES,
  TRAINING_EVENT_TYPES,
  CATALOG_PUBLISH_STATUS,
  PARTICIPATION_TYPES,
} = require('../config/constants');

const optionalUrl = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
  z.string().trim().max(512).nullable().optional()
);

const optionalWebsiteUrl = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
  z
    .string()
    .trim()
    .max(512)
    .nullable()
    .optional()
    .refine((val) => val === null || val === undefined || /^https?:\/\/.+/i.test(val), {
      message: 'URL invalide (https://)',
    })
);

const optionalEmail = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
  z.string().trim().email().max(255).nullable().optional()
);

const gallerySchema = z.array(z.string().trim().max(512)).max(7).optional();

const formationBodySchema = z.object({
  title: z.string().trim().min(2).max(255),
  category: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(120).nullable().optional()
  ),
  shortDescription: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(500).nullable().optional()
  ),
  description: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(20000).nullable().optional()
  ),
  startDate: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()
  ),
  endDate: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()
  ),
  durationLabel: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(120).nullable().optional()
  ),
  city: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(120).nullable().optional()
  ),
  address: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(255).nullable().optional()
  ),
  deliveryMode: z.enum(TRAINING_DELIVERY_MODES).optional(),
  price: z.coerce.number().min(0).nullable().optional(),
  certificateDelivered: z.boolean().optional(),
  seats: z.coerce.number().int().min(0).nullable().optional(),
  mainImageUrl: optionalUrl,
  gallery: gallerySchema,
  phone: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(50).nullable().optional()
  ),
  email: optionalEmail,
  website: optionalWebsiteUrl,
  status: z
    .enum([
      CATALOG_PUBLISH_STATUS.DRAFT,
      CATALOG_PUBLISH_STATUS.PENDING,
    ])
    .optional(),
});

const eventBodySchema = z.object({
  title: z.string().trim().min(2).max(255),
  eventType: z.enum(TRAINING_EVENT_TYPES),
  description: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(20000).nullable().optional()
  ),
  eventDate: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()
  ),
  startTime: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional()
  ),
  endTime: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional()
  ),
  city: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(120).nullable().optional()
  ),
  address: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(255).nullable().optional()
  ),
  price: z.coerce.number().min(0).nullable().optional(),
  seats: z.coerce.number().int().min(0).nullable().optional(),
  posterImageUrl: optionalUrl,
  gallery: gallerySchema,
  phone: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(50).nullable().optional()
  ),
  email: optionalEmail,
  website: optionalWebsiteUrl,
  status: z
    .enum([
      CATALOG_PUBLISH_STATUS.DRAFT,
      CATALOG_PUBLISH_STATUS.PENDING,
    ])
    .optional(),
});

const offeringIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const formationIdParamsSchema = z.object({
  formationId: z.string().uuid(),
});

const eventIdParamsSchema = z.object({
  eventId: z.string().uuid(),
});

const centerIdParamsSchema = z.object({
  centerId: z.string().uuid(),
});

const participateBodySchema = z.object({
  participationType: z
    .enum([PARTICIPATION_TYPES.REGISTERED, PARTICIPATION_TYPES.INTERESTED])
    .default(PARTICIPATION_TYPES.REGISTERED),
});

const adminOfferingStatusSchema = z.object({
  status: z.enum([
    CATALOG_PUBLISH_STATUS.PENDING,
    CATALOG_PUBLISH_STATUS.PUBLISHED,
    CATALOG_PUBLISH_STATUS.REJECTED,
  ]),
  adminNote: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(2000).nullable().optional()
  ),
});

const listParticipationsQuerySchema = z.object({
  offeringKind: z.enum(['formation', 'event']).optional(),
  offeringId: z.string().uuid().optional(),
  participationType: z.enum([
    PARTICIPATION_TYPES.INTERESTED,
    PARTICIPATION_TYPES.REGISTERED,
  ]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const providerListOfferingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z
    .enum([
      CATALOG_PUBLISH_STATUS.DRAFT,
      CATALOG_PUBLISH_STATUS.PENDING,
      CATALOG_PUBLISH_STATUS.PUBLISHED,
      CATALOG_PUBLISH_STATUS.REJECTED,
    ])
    .optional(),
  search: z.string().trim().max(120).optional(),
});

const publicListCenterOfferingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(120).optional(),
});

const adminListOfferingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(120).optional(),
  status: z
    .enum([
      CATALOG_PUBLISH_STATUS.PENDING,
      CATALOG_PUBLISH_STATUS.PUBLISHED,
      CATALOG_PUBLISH_STATUS.REJECTED,
    ])
    .optional(),
});

module.exports = {
  formationBodySchema,
  eventBodySchema,
  offeringIdParamsSchema,
  formationIdParamsSchema,
  eventIdParamsSchema,
  centerIdParamsSchema,
  participateBodySchema,
  listParticipationsQuerySchema,
  providerListOfferingsQuerySchema,
  publicListCenterOfferingsQuerySchema,
  adminOfferingStatusSchema,
  adminListOfferingsQuerySchema,
};
