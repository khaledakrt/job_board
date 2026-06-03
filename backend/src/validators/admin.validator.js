'use strict';

const { z } = require('zod');
const { USER_ROLES, JOB_STATUS } = require('../config/constants');

const listUsersQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  role: z.enum([USER_ROLES.CANDIDATE, USER_ROLES.RECRUITER, USER_ROLES.ADMIN]).optional(),
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

const userIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const jobIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const createUserBodySchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  role: z.enum([USER_ROLES.CANDIDATE, USER_ROLES.RECRUITER, USER_ROLES.ADMIN]),
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
    role: z.enum([USER_ROLES.CANDIDATE, USER_ROLES.RECRUITER, USER_ROLES.ADMIN]).optional(),
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

module.exports = {
  listUsersQuerySchema,
  listJobsQuerySchema,
  userIdParamsSchema,
  jobIdParamsSchema,
  createUserBodySchema,
  updateUserBodySchema,
  setPasswordBodySchema,
  banUserBodySchema,
  updateJobStatusBodySchema,
};
