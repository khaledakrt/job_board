'use strict';

const { z } = require('zod');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .optional();

const inviteTeamMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: passwordSchema,
  jobTitle: z.string().trim().max(255).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
  canPostJob: z.boolean().optional().default(false),
  canDecideApplication: z.boolean().optional().default(false),
  canEditCompany: z.boolean().optional().default(false),
  companyRole: z.literal('recruiter').optional().default('recruiter'),
});

const updateTeamMemberSchema = z.object({
  jobTitle: z.string().trim().max(255).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
  canPostJob: z.boolean().optional(),
  canDecideApplication: z.boolean().optional(),
  canEditCompany: z.boolean().optional(),
});

module.exports = {
  inviteTeamMemberSchema,
  updateTeamMemberSchema,
};
