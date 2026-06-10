'use strict';

const { z } = require('zod');
const { REMOTE_TYPES, CONTRACT_TYPES } = require('../config/constants');

function csvEnumList(values) {
  return z
    .preprocess((value) => {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        return value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
      return value;
    }, z.array(z.enum(values)).max(10))
    .optional();
}

const optionalBoolean = z
  .preprocess((value) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false || value == null || value === '') return false;
    return value;
  }, z.boolean())
  .optional();

const publicJobSearchQuerySchema = z.object({
  keywords: z.string().trim().max(255).optional(),
  location: z.string().trim().max(255).optional(),
  company: z.string().trim().max(255).optional(),
  industry: z.string().trim().max(255).optional(),
  contractType: z.enum(CONTRACT_TYPES).optional(),
  remoteType: z.enum(REMOTE_TYPES).optional(),
  contracts: csvEnumList(CONTRACT_TYPES),
  remotes: csvEnumList(REMOTE_TYPES),
  experience: z.enum(['all', 'junior', 'mid', 'senior']).optional(),
  quizOnly: optionalBoolean,
  minSalary: z.coerce.number().nonnegative().optional(),
  sortBy: z.enum(['date', 'salary', 'experience']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

module.exports = {
  publicJobSearchQuerySchema,
};
