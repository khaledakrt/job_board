'use strict';

const { z } = require('zod');
const { USER_ROLES, JOB_STATUS, APPLICATION_STATUS } = require('../config/constants');

const listUsersQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  role: z.enum(Object.values(USER_ROLES)).optional(),
  banned: z.enum(['true', 'false']).optional(),
  search: z.string().max(255).optional(),
  ip: z.string().max(45).optional(),
});

const listJobsQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  status: z.enum(Object.values(JOB_STATUS)).optional(),
  search: z.string().max(255).optional(),
});

const listApplicationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(Object.values(APPLICATION_STATUS)).optional(),
  search: z.string().max(255).optional(),
});

const userIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const jobIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const applicationIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const companyIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const createUserBodySchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  role: z.enum(Object.values(USER_ROLES)),
  isVerified: z.boolean().optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  professionalTitle: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  companyId: z.string().uuid().optional(),
  companyName: z.string().max(255).optional(),
  companyIndustry: z.string().max(100).optional(),
  jobTitle: z.string().max(255).optional(),
});

const updateUserBodySchema = z
  .object({
    email: z.string().email().max(255).optional(),
    role: z.enum(Object.values(USER_ROLES)).optional(),
    isVerified: z.boolean().optional(),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field required' });

const setPasswordBodySchema = z.object({
  password: z.string().min(8).max(128),
});

const banUserBodySchema = z.object({
  reason: z.string().max(500).optional(),
});

const updateJobStatusBodySchema = z.object({
  status: z.enum(Object.values(JOB_STATUS)),
});

const listCatalogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(['pending', 'published', 'rejected']).optional(),
  search: z.string().max(255).optional(),
});

const listInstitutionOfferingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(['draft', 'pending', 'published', 'rejected']).optional(),
  type: z.enum(['program', 'event', 'announcement']).optional(),
  search: z.string().max(255).optional(),
  institutionSearch: z.string().max(255).optional(),
});

const catalogIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const { TRAINING_DELIVERY_MODES, INSTITUTION_TYPES, CATALOG_PUBLISH_STATUS } = require('../config/constants');

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
    .refine((val) => val === null || /^https?:\/\/.+/i.test(val), 'URL invalide (https://)')
);

const optionalEmail = z.preprocess(
  emptyToNull,
  z.string().email('E-mail invalide').max(255).nullable().optional()
);

const catalogStatusSchema = z.enum([
  CATALOG_PUBLISH_STATUS.PENDING,
  CATALOG_PUBLISH_STATUS.PUBLISHED,
  CATALOG_PUBLISH_STATUS.REJECTED,
]);

const adminCreateTrainingCenterSchema = z.object({
  name: z.string().trim().min(2).max(255),
  description: z.preprocess(emptyToNull, z.string().trim().max(20000).nullable().optional()),
  city: z.preprocess(emptyToNull, z.string().trim().max(128).nullable().optional()),
  address: z.preprocess(emptyToNull, z.string().trim().max(512).nullable().optional()),
  phone: z.preprocess(emptyToNull, z.string().trim().max(64).nullable().optional()),
  email: optionalEmail,
  website: optionalUrl,
  trainingDomain: z.preprocess(emptyToNull, z.string().trim().max(128).nullable().optional()),
  deliveryMode: z.enum(TRAINING_DELIVERY_MODES).optional(),
  status: catalogStatusSchema.optional().default(CATALOG_PUBLISH_STATUS.PUBLISHED),
});

const adminUpdateTrainingCenterSchema = adminCreateTrainingCenterSchema.partial();

const adminCreatePrivateInstitutionSchema = z.object({
  name: z.string().trim().min(2).max(255),
  institutionType: z.enum(INSTITUTION_TYPES),
  description: z.preprocess(emptyToNull, z.string().trim().max(20000).nullable().optional()),
  city: z.preprocess(emptyToNull, z.string().trim().max(128).nullable().optional()),
  address: z.preprocess(emptyToNull, z.string().trim().max(512).nullable().optional()),
  phone: z.preprocess(emptyToNull, z.string().trim().max(64).nullable().optional()),
  email: optionalEmail,
  website: optionalUrl,
  mapUrl: optionalUrl,
  status: catalogStatusSchema.optional().default(CATALOG_PUBLISH_STATUS.PUBLISHED),
});

const adminUpdatePrivateInstitutionSchema = adminCreatePrivateInstitutionSchema.partial();

module.exports = {
  listUsersQuerySchema,
  listJobsQuerySchema,
  listApplicationsQuerySchema,
  userIdParamsSchema,
  jobIdParamsSchema,
  applicationIdParamsSchema,
  companyIdParamsSchema,
  createUserBodySchema,
  updateUserBodySchema,
  setPasswordBodySchema,
  banUserBodySchema,
  updateJobStatusBodySchema,
  listCatalogQuerySchema,
  listInstitutionOfferingsQuerySchema,
  catalogIdParamsSchema,
  adminCreateTrainingCenterSchema,
  adminUpdateTrainingCenterSchema,
  adminCreatePrivateInstitutionSchema,
  adminUpdatePrivateInstitutionSchema,
};
