'use strict';

const { z } = require('zod');

const OFFERING_TYPES = ['program', 'event', 'announcement'];
const OFFERING_STATUSES = ['draft', 'pending', 'published', 'rejected'];
const EVENT_TYPES = [
  'open_day',
  'conference',
  'seminar',
  'workshop',
  'webinar',
  'admission_contest',
  'other',
];

function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
}

const nullableString = (max) =>
  z.preprocess(
    emptyToNull,
    z.string().trim().max(max).nullable().optional()
  );

const optionalUrl = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .max(512)
    .nullable()
    .optional()
    .refine((value) => value === null || /^https?:\/\/.+/i.test(value), 'URL invalide (https://)')
);

const optionalEmail = z.preprocess(
  emptyToNull,
  z.string().trim().email('E-mail invalide').max(255).nullable().optional()
);

const optionalDate = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide')
    .nullable()
    .optional()
);

const optionalTime = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Heure invalide')
    .nullable()
    .optional()
);

const offeringTypeParamsSchema = z.object({
  offeringType: z.enum(OFFERING_TYPES),
});

const offeringIdParamsSchema = z.object({
  offeringId: z.string().uuid(),
});

const listInstitutionOfferingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  type: z.enum(OFFERING_TYPES).optional(),
  status: z.enum(OFFERING_STATUSES).optional(),
  search: z.string().trim().max(120).optional(),
});

const institutionOfferingBodySchema = z.object({
  title: z.string().trim().min(2).max(255),
  summary: nullableString(500),
  description: nullableString(20000),
  category: nullableString(128),
  eventType: z.enum(EVENT_TYPES).nullable().optional(),
  opportunityType: z.enum(['job', 'internship']).nullable().optional(),
  startDate: optionalDate,
  endDate: optionalDate,
  startTime: optionalTime,
  endTime: optionalTime,
  city: nullableString(128),
  address: nullableString(512),
  price: z.coerce.number().min(0).nullable().optional(),
  seats: z.coerce.number().int().min(0).nullable().optional(),
  mainImageUrl: optionalUrl,
  gallery: z.array(z.string().trim().url('URL galerie invalide').max(512)).max(7).optional(),
  phone: nullableString(64),
  email: optionalEmail,
  website: optionalUrl,
  status: z.enum(['draft', 'pending']).optional(),
});

module.exports = {
  offeringTypeParamsSchema,
  offeringIdParamsSchema,
  listInstitutionOfferingsQuerySchema,
  institutionOfferingBodySchema,
  OFFERING_TYPES,
  OFFERING_STATUSES,
};
