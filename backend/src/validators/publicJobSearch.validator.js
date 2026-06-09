'use strict';

const { z } = require('zod');
const { REMOTE_TYPES, CONTRACT_TYPES } = require('../config/constants');

const publicJobSearchQuerySchema = z.object({
  keywords: z.string().trim().max(255).optional(),
  location: z.string().trim().max(255).optional(),
  contractType: z.enum(CONTRACT_TYPES).optional(),
  remoteType: z.enum(REMOTE_TYPES).optional(),
  minSalary: z.coerce.number().nonnegative().optional(),
  sortBy: z.enum(['date', 'salary', 'experience']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

module.exports = {
  publicJobSearchQuerySchema,
};
