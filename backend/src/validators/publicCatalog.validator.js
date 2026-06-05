'use strict';

const { z } = require('zod');
const {
  CATALOG_PUBLISH_STATUS,
  TRAINING_DELIVERY_MODES,
  INSTITUTION_TYPES,
} = require('../config/constants');

function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
}

const optionalUrl = z.preprocess(
  emptyToNull,
  z
    .string()
    .max(512)
    .nullable()
    .optional()
    .refine(
      (val) => val === null || /^https?:\/\/.+/i.test(val),
      'URL invalide (https://)'
    )
);

const optionalEmail = z.preprocess(
  emptyToNull,
  z.string().email('E-mail invalide').max(255).nullable().optional()
);

const socialLinkSchema = z.object({
  label: z.string().trim().max(64).optional(),
  url: z.string().trim().url('URL réseau social invalide').max(512),
});

const courseSchema = z.object({
  title: z.string().trim().min(2).max(255),
  description: z.preprocess(emptyToNull, z.string().trim().max(5000).nullable().optional()),
  deliveryMode: z.enum(TRAINING_DELIVERY_MODES).optional(),
});

const programSchema = z.object({
  title: z.string().trim().min(2).max(255),
  description: z.preprocess(emptyToNull, z.string().trim().max(5000).nullable().optional()),
});

const listTrainingCentersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  search: z.preprocess(emptyToNull, z.string().trim().max(200).nullable().optional()),
  city: z.preprocess(emptyToNull, z.string().trim().max(128).nullable().optional()),
  domain: z.preprocess(emptyToNull, z.string().trim().max(128).nullable().optional()),
  deliveryMode: z.enum(TRAINING_DELIVERY_MODES).optional(),
});

const listInstitutionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  search: z.preprocess(emptyToNull, z.string().trim().max(200).nullable().optional()),
  city: z.preprocess(emptyToNull, z.string().trim().max(128).nullable().optional()),
  type: z.enum(INSTITUTION_TYPES).optional(),
});

const idParamsSchema = z.object({
  id: z.string().uuid('Identifiant invalide'),
});

const submitTrainingCenterSchema = z.object({
  name: z.string().trim().min(2).max(255),
  logoUrl: optionalUrl,
  description: z.string().trim().min(20, 'Description min. 20 caractères').max(20000),
  address: z.preprocess(emptyToNull, z.string().trim().max(512).nullable().optional()),
  city: z.preprocess(emptyToNull, z.string().trim().max(128).nullable().optional()),
  phone: z.preprocess(emptyToNull, z.string().trim().max(64).nullable().optional()),
  email: optionalEmail,
  website: optionalUrl,
  trainingDomain: z.preprocess(emptyToNull, z.string().trim().max(128).nullable().optional()),
  deliveryMode: z.enum(TRAINING_DELIVERY_MODES).optional(),
  photoUrls: z.array(z.string().trim().url()).max(12).optional().default([]),
  socialLinks: z.array(socialLinkSchema).max(8).optional().default([]),
  courses: z.array(courseSchema).min(1, 'Ajoutez au moins une formation'),
});

const submitPrivateInstitutionSchema = z.object({
  name: z.string().trim().min(2).max(255),
  institutionType: z.enum(INSTITUTION_TYPES),
  logoUrl: optionalUrl,
  description: z.string().trim().min(20, 'Description min. 20 caractères').max(20000),
  address: z.preprocess(emptyToNull, z.string().trim().max(512).nullable().optional()),
  city: z.preprocess(emptyToNull, z.string().trim().max(128).nullable().optional()),
  phone: z.preprocess(emptyToNull, z.string().trim().max(64).nullable().optional()),
  email: optionalEmail,
  website: optionalUrl,
  mapUrl: optionalUrl,
  photoUrls: z.array(z.string().trim().url()).max(12).optional().default([]),
  socialLinks: z.array(socialLinkSchema).max(8).optional().default([]),
  programs: z.array(programSchema).min(1, 'Ajoutez au moins un programme'),
});

const updateCatalogStatusSchema = z.object({
  status: z.enum([
    CATALOG_PUBLISH_STATUS.PENDING,
    CATALOG_PUBLISH_STATUS.PUBLISHED,
    CATALOG_PUBLISH_STATUS.REJECTED,
  ]),
});

module.exports = {
  listTrainingCentersQuerySchema,
  listInstitutionsQuerySchema,
  idParamsSchema,
  submitTrainingCenterSchema,
  submitPrivateInstitutionSchema,
  updateCatalogStatusSchema,
};
