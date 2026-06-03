'use strict';

const { z } = require('zod');

const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

const memberIdParamSchema = z.object({
  memberId: z.string().uuid('Invalid member ID format'),
});

const jobIdParamSchema = z.object({
  id: z.string().uuid('Invalid job ID format'),
});

const applicationIdParamSchema = z.object({
  id: z.string().uuid('Invalid application ID format'),
});

module.exports = {
  uuidParamSchema,
  memberIdParamSchema,
  jobIdParamSchema,
  applicationIdParamSchema,
};
