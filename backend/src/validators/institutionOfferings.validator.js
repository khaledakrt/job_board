'use strict';

const { z } = require('zod');

const OFFERING_TYPES = ['program', 'event', 'announcement', 'opportunity'];
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

const nullableString = (max) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(max).nullable().optional()
  );

const offeringTypeParamsSchema = z.object({
  offeringType: z.enum(OFFERING_TYPES),
});

const offeringIdParamsSchema = z.object({
  offeringId: z.string().uuid(),
});

const listInstitutionOfferingsQuerySchema = z.object({
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
  startDate: nullableString(20),
  endDate: nullableString(20),
  startTime: nullableString(20),
  endTime: nullableString(20),
  city: nullableString(128),
  address: nullableString(512),
  price: z.coerce.number().min(0).nullable().optional(),
  seats: z.coerce.number().int().min(0).nullable().optional(),
  mainImageUrl: nullableString(512),
  gallery: z.array(z.string().trim().max(512)).max(8).optional(),
  phone: nullableString(64),
  email: nullableString(255),
  website: nullableString(512),
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
