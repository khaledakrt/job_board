'use strict';

const { z } = require('zod');

const inviteTeamMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  jobTitle: z.string().trim().max(255).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
  canPostJob: z.boolean().optional().default(false),
  canDecideApplication: z.boolean().optional().default(false),
  canEditCompany: z.boolean().optional().default(false),
  companyRole: z.literal('recruiter').optional().default('recruiter'),
});

const updateTeamMemberSchema = z.object({
  firstName: z.string().trim().max(100).optional().nullable(),
  lastName: z.string().trim().max(100).optional().nullable(),
  jobTitle: z.string().trim().max(255).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
  canPostJob: z.boolean().optional(),
  canDecideApplication: z.boolean().optional(),
  canEditCompany: z.boolean().optional(),
  companyRole: z.enum(['owner', 'recruiter']).optional(),
});

const updateOwnProfileSchema = z.object({
  firstName: z.string().trim().max(100).optional().nullable(),
  lastName: z.string().trim().max(100).optional().nullable(),
  jobTitle: z.string().trim().max(255).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
});

module.exports = {
  inviteTeamMemberSchema,
  updateTeamMemberSchema,
  updateOwnProfileSchema,
};
