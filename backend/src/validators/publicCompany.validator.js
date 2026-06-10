'use strict';

const { z } = require('zod');

const publicCompanyQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

const publicCompanyDirectoryQuerySchema = z.object({
  search: z.string().trim().max(255).optional(),
  city: z.string().trim().max(128).optional(),
  industry: z.string().trim().max(128).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

module.exports = {
  publicCompanyQuerySchema,
  publicCompanyDirectoryQuerySchema,
};
