'use strict';

const { z } = require('zod');

const skillSchema = z.union([z.string().min(1).max(80), z.array(z.string().min(1).max(80))]);

const experienceSchema = z.object({
  company: z.string().max(255).optional(),
  title: z.string().max(255).optional(),
  startDate: z.string().max(32).optional(),
  endDate: z.string().max(32).optional(),
  description: z.string().max(5000).optional(),
});

const educationSchema = z.object({
  institution: z.string().max(255).optional(),
  degree: z.string().max(255).optional(),
  startDate: z.string().max(32).optional(),
  endDate: z.string().max(32).optional(),
});

const jobPreferencesSchema = z
  .object({
    contractTypes: z.array(z.string().max(32)).max(8).optional(),
    remoteTypes: z.array(z.string().max(32)).max(8).optional(),
    preferredLocations: z.array(z.string().max(128)).max(10).optional(),
    mobility: z.string().max(255).optional(),
  })
  .optional()
  .nullable();

const notificationPreferencesSchema = z
  .object({
    emailEnabled: z.boolean().optional(),
    inAppEnabled: z.boolean().optional(),
    statusChange: z.boolean().optional(),
    recruiterMessage: z.boolean().optional(),
    jobAlert: z.boolean().optional(),
  })
  .optional()
  .nullable();

const profileBodySchema = z.object({
  firstName: z.string().trim().min(1).max(128).optional().nullable(),
  lastName: z.string().trim().min(1).max(128).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
  professionalTitle: z.string().trim().max(255).optional().nullable(),
  bio: z.string().max(10000).optional().nullable(),
  skills: skillSchema.optional().nullable().transform((val) => {
    if (!val) return null;
    return Array.isArray(val) ? val : [val];
  }),
  experiences: z.array(experienceSchema).max(30).optional().nullable(),
  education: z.array(educationSchema).max(20).optional().nullable(),
  languages: z.array(z.string().trim().min(1).max(64)).max(20).optional().nullable(),
  certifications: z.array(z.string().trim().min(1).max(128)).max(30).optional().nullable(),
  linkedinUrl: z
    .preprocess((v) => (v === '' || v == null ? null : v), z.string().url().max(512).nullable().optional()),
  portfolioUrl: z
    .preprocess((v) => (v === '' || v == null ? null : v), z.string().url().max(512).nullable().optional()),
  jobPreferences: jobPreferencesSchema,
  notificationPreferences: notificationPreferencesSchema,
  onboardingCompleted: z.boolean().optional(),
  minSalary: z.coerce.number().nonnegative().optional().nullable(),
});

const createProfileSchema = profileBodySchema.extend({
  firstName: z.string().trim().min(1).max(128),
});

const updateProfileSchema = profileBodySchema;

const generateLetterSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
});

const quizAnswerSchema = z.object({
  questionIndex: z.number().int().min(0).max(1),
  choiceIndex: z.number().int().min(0).max(2),
});

const applyToJobSchema = z.object({
  coverLetter: z
    .union([z.string().trim().min(1).max(15000), z.literal(''), z.null()])
    .optional()
    .transform((val) => (val && String(val).trim().length > 0 ? String(val).trim() : null)),
  quizAnswers: z.array(quizAnswerSchema).min(1).max(2).optional(),
});

module.exports = {
  createProfileSchema,
  updateProfileSchema,
  generateLetterSchema,
  applyToJobSchema,
};
