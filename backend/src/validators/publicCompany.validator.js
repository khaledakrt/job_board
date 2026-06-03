'use strict';

const { z } = require('zod');

const publicCompanyQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

module.exports = {
  publicCompanyQuerySchema,
};
