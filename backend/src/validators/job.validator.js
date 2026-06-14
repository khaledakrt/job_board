'use strict';

const { z } = require('zod');
const { plainTextLength, sanitizeRichText } = require('../utils/richText');
const { parseExpiresAt } = require('../utils/jobExpiration');
const {
  JOB_STATUS,
  JOB_MANUAL_STATUSES,
  REMOTE_TYPES,
  CONTRACT_TYPES,
  MAX_LIMIT,
} = require('../config/constants');

const quizChoiceSchema = z.object({
  text: z.string().trim().min(1).max(500),
});

const quizQuestionSchema = z.object({
  text: z.string().trim().min(5).max(1000),
  choices: z.array(quizChoiceSchema).length(3),
  correctChoiceIndex: z.number().int().min(0).max(2),
});

const quizSchema = z.object({
  questions: z.array(quizQuestionSchema).length(2),
});

/**
 * Nettoie tags / langues / avantages (skills) : ignore entrées vides,
 * convertit en chaînes, limite la longueur et le nombre d’éléments.
 */
function cleanStringList(val, { maxItems, maxLen }) {
  if (val == null) return null;

  let list = val;
  if (!Array.isArray(list)) {
    if (typeof list === 'string') {
      const trimmed = list.trim();
      if (!trimmed) return null;
      try {
        const parsed = JSON.parse(trimmed);
        list = Array.isArray(parsed) ? parsed : [trimmed];
      } catch {
        list = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
      }
    } else {
      return null;
    }
  }

  const cleaned = [];
  for (const item of list) {
    const s = String(item ?? '').trim().slice(0, maxLen);
    if (!s) continue;
    cleaned.push(s);
    if (cleaned.length >= maxItems) break;
  }

  return cleaned.length > 0 ? cleaned : null;
}

function stringListSchema(maxItems, maxLen) {
  return z.preprocess(
    (val) => cleanStringList(val, { maxItems, maxLen }),
    z
      .union([z.array(z.string().min(1).max(maxLen)).max(maxItems), z.null()])
      .optional()
  );
}

function richTextSchema({ minPlainTextLength = 0 } = {}) {
  let schema = z
    .string()
    .trim()
    .max(50000)
    .transform(sanitizeRichText);

  if (minPlainTextLength > 0) {
    schema = schema.refine((v) => plainTextLength(v) >= minPlainTextLength, {
      message: `Description must be at least ${minPlainTextLength} characters`,
    });
  }

  return schema;
}

function optionalRichTextSchema() {
  return richTextSchema()
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : v));
}

function validateSalaryRange(data, ctx) {
  if (data.salaryMin != null && data.salaryMax != null && data.salaryMax < data.salaryMin) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Le salaire maximum doit être supérieur ou égal au salaire minimum',
      path: ['salaryMax'],
    });
  }
}

const jobBodyBaseSchema = z.object({
  title: z.string().trim().min(3).max(255),
  description: richTextSchema({ minPlainTextLength: 20 }),
  requirements: optionalRichTextSchema(),
  tags: stringListSchema(20, 50),
  languages: stringListSchema(15, 50),
  benefits: stringListSchema(20, 80),
  experienceYears: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : val),
    z.coerce.number().int().min(0).max(50).nullable().optional()
  ),
  location: z.string().trim().max(255).optional().nullable(),
  remoteType: z.enum(REMOTE_TYPES).default('on-site'),
  contractType: z.enum(CONTRACT_TYPES).default('CDI'),
  salaryLabel: z
    .string()
    .trim()
    .max(255)
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  salaryMin: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : val),
    z.coerce.number().min(0).max(999999999).nullable().optional()
  ),
  salaryMax: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : val),
    z.coerce.number().min(0).max(999999999).nullable().optional()
  ),
  salaryCurrency: z
    .preprocess(
      (val) => (val === '' || val === null || val === undefined ? null : String(val).trim().toUpperCase()),
      z.enum(['TND', 'EUR', 'USD']).nullable().optional()
    ),
  salaryPeriod: z
    .preprocess(
      (val) => (val === '' || val === null || val === undefined ? null : val),
      z.enum(['month', 'year', 'day', 'hour']).nullable().optional()
    ),
  status: z.enum(JOB_MANUAL_STATUSES).optional(),
  expiresAt: z.coerce.date().optional(),
  quizEnabled: z.boolean().optional().default(false),
  quiz: quizSchema.optional().nullable(),
});

const createJobSchema = jobBodyBaseSchema
  .extend({
    expiresAt: z.coerce
      .date()
      .transform((d) => parseExpiresAt(d))
      .refine((d) => d != null && d.getTime() > Date.now(), {
        message: 'La date d\'expiration doit être dans le futur',
      }),
  })
  .superRefine((data, ctx) => {
    validateSalaryRange(data, ctx);
    if (data.quizEnabled && !data.quiz) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Configurez le quiz ou désactivez-le',
        path: ['quiz'],
      });
    }
  });

const updateJobSchema = jobBodyBaseSchema.partial().superRefine(validateSalaryRange);

const updateJobStatusSchema = z.object({
  status: z.enum(JOB_MANUAL_STATUSES),
});

/** Looser than createJob — quiz can be generated while the offer form is still being filled. */
const generateQuizSchema = z
  .object({
    title: z.string().trim().max(255).optional().default(''),
    description: richTextSchema().optional().default(''),
    requirements: optionalRichTextSchema(),
    tags: stringListSchema(20, 50),
    languages: stringListSchema(15, 50),
    benefits: stringListSchema(20, 80),
  })
  .transform((data) => ({
    title: data.title.length >= 1 ? data.title : 'Offre d\'emploi',
    description:
      data.description.length >= 1
        ? data.description
        : 'Poste à pourvoir — complétez la description dans le formulaire.',
    requirements: data.requirements,
    tags: data.tags ?? null,
    languages: data.languages ?? null,
    benefits: data.benefits ?? null,
  }));

const listJobsQuerySchema = z.object({
  status: z
    .enum([JOB_STATUS.DRAFT, JOB_STATUS.ACTIVE, JOB_STATUS.HIDDEN, JOB_STATUS.EXPIRED])
    .optional(),
  archived: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
});

module.exports = {
  createJobSchema,
  updateJobSchema,
  updateJobStatusSchema,
  listJobsQuerySchema,
  generateQuizSchema,
};
