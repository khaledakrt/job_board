'use strict';

const { z } = require('zod');

const currentYear = new Date().getFullYear();

function emptyToNull(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
}

const optionalUrl = z.preprocess(
  emptyToNull,
  z
    .string()
    .max(512)
    .nullable()
    .optional()
    .refine(
      (val) => val === null || /^https?:\/\/.+/i.test(val),
      'URL invalide (commencez par https://)'
    )
);

const optionalEmail = z.preprocess(
  emptyToNull,
  z.string().email('E-mail invalide').max(255).nullable().optional()
);

const optionalSiret = z.preprocess(
  emptyToNull,
  z
    .string()
    .max(14)
    .nullable()
    .optional()
    .refine(
      (val) => val === null || /^\d{14}$/.test(val.replace(/\s/g, '')),
      'Le SIRET doit contenir 14 chiffres'
    )
    .transform((val) => (val ? val.replace(/\s/g, '') : null))
);

const companyFields = {
  name: z.string().trim().min(2, 'Nom requis (2 caractères min.)').max(255),
  legalName: z.preprocess(emptyToNull, z.string().trim().max(255).nullable().optional()),
  legalForm: z.preprocess(emptyToNull, z.string().trim().max(64).nullable().optional()),
  siret: optionalSiret,
  vatNumber: z.preprocess(emptyToNull, z.string().trim().max(32).nullable().optional()),
  streetAddress: z.preprocess(emptyToNull, z.string().trim().max(255).nullable().optional()),
  postalCode: z.preprocess(emptyToNull, z.string().trim().max(20).nullable().optional()),
  city: z.preprocess(emptyToNull, z.string().trim().max(128).nullable().optional()),
  country: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() ? v.trim() : 'France'),
    z.string().trim().max(64)
  ),
  contactEmail: optionalEmail,
  contactPhone: z.preprocess(emptyToNull, z.string().trim().max(32).nullable().optional()),
  contactEmailPublic: z.boolean().optional(),
  contactPhonePublic: z.boolean().optional(),
  website: optionalUrl,
  linkedinUrl: optionalUrl,
  description: z.preprocess(emptyToNull, z.string().max(10000).nullable().optional()),
  industry: z.preprocess(emptyToNull, z.string().trim().max(128).nullable().optional()),
  scaleSize: z.preprocess(emptyToNull, z.string().trim().max(64).nullable().optional()),
  foundedYear: z.preprocess(
    emptyToNull,
    z.coerce
      .number()
      .int()
      .min(1800, 'Année invalide')
      .max(currentYear, 'Année invalide')
      .nullable()
      .optional()
  ),
};

const createCompanySchema = z.object({
  ...companyFields,
  ownerJobTitle: z.preprocess(emptyToNull, z.string().trim().max(255).nullable().optional()),
  ownerPhone: z.preprocess(emptyToNull, z.string().trim().max(32).nullable().optional()),
});

const updateCompanySchema = z.object({
  name: companyFields.name.optional(),
  legalName: companyFields.legalName,
  legalForm: companyFields.legalForm,
  siret: companyFields.siret,
  vatNumber: companyFields.vatNumber,
  streetAddress: companyFields.streetAddress,
  postalCode: companyFields.postalCode,
  city: companyFields.city,
  country: companyFields.country.optional(),
  contactEmail: companyFields.contactEmail,
  contactPhone: companyFields.contactPhone,
  contactEmailPublic: companyFields.contactEmailPublic,
  contactPhonePublic: companyFields.contactPhonePublic,
  website: companyFields.website,
  linkedinUrl: companyFields.linkedinUrl,
  description: companyFields.description,
  industry: companyFields.industry,
  scaleSize: companyFields.scaleSize,
  foundedYear: companyFields.foundedYear,
});

module.exports = {
  createCompanySchema,
  updateCompanySchema,
};
