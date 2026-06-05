'use strict';

const { z } = require('zod');
const { TRAINING_DELIVERY_MODES, INSTITUTION_TYPES } = require('../config/constants');
const { submitTrainingCenterSchema, submitPrivateInstitutionSchema } = require('./publicCatalog.validator');

const passwordSchema = z
  .string()
  .min(8, 'Mot de passe : 8 caractères minimum')
  .max(128);

const registerProviderSchema = z.object({
  providerType: z.enum(['training_center', 'private_institution']),
  email: z.string().trim().toLowerCase().email().max(255),
  password: passwordSchema,
  organizationName: z.string().trim().min(2).max(255),
  city: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(128).nullable().optional()
  ),
  phone: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(64).nullable().optional()
  ),
});

const updateTrainingCenterProfileSchema = submitTrainingCenterSchema
  .omit({ courses: true })
  .partial()
  .extend({
    name: z.string().trim().min(2).max(255).optional(),
    description: z.string().trim().min(20).max(20000).optional(),
  });

const updateInstitutionProfileSchema = submitPrivateInstitutionSchema
  .omit({ programs: true, institutionType: true })
  .partial()
  .extend({
    name: z.string().trim().min(2).max(255).optional(),
    description: z.string().trim().min(20).max(20000).optional(),
    institutionType: z.enum(INSTITUTION_TYPES).optional(),
  });

const courseBodySchema = z.object({
  title: z.string().trim().min(2).max(255),
  description: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(5000).nullable().optional()
  ),
  deliveryMode: z.enum(TRAINING_DELIVERY_MODES).optional(),
  status: z.enum(['draft', 'published']).optional(),
});

const programBodySchema = z.object({
  title: z.string().trim().min(2).max(255),
  description: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(5000).nullable().optional()
  ),
});

const courseIdParamsSchema = z.object({
  courseId: z.string().uuid(),
});

const programIndexParamsSchema = z.object({
  index: z.coerce.number().int().min(0),
});

module.exports = {
  registerProviderSchema,
  updateTrainingCenterProfileSchema,
  updateInstitutionProfileSchema,
  courseBodySchema,
  programBodySchema,
  courseIdParamsSchema,
  programIndexParamsSchema,
};
