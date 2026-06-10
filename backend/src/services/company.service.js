'use strict';

const { sequelize } = require('../database/connection');
const {
  Company,
  RecruiterProfile,
  User,
} = require('../models');
const { COMPANY_ROLES, USER_ROLES } = require('../config/constants');
const ApiError = require('../utils/ApiError');
const { generateUuid } = require('../utils/uuid');
const { buildLogoPublicUrl, deleteLogoFile } = require('../utils/fileStorage');
const subscriptionService = require('./subscription.service');

function formatCompany(company) {
  return {
    id: company.id,
    name: company.name,
    legalName: company.legal_name,
    legalForm: company.legal_form,
    siret: company.siret,
    vatNumber: company.vat_number,
    streetAddress: company.street_address,
    postalCode: company.postal_code,
    city: company.city,
    country: company.country,
    contactEmail: company.contact_email,
    contactPhone: company.contact_phone,
    contactEmailPublic: Boolean(company.contact_email_public),
    contactPhonePublic: Boolean(company.contact_phone_public),
    logoUrl: company.logo_url,
    website: company.website,
    linkedinUrl: company.linkedin_url,
    description: company.description,
    industry: company.industry,
    scaleSize: company.scale_size,
    foundedYear: company.founded_year,
    createdAt: company.created_at,
  };
}

function companyAttributesFromPayload(payload) {
  return {
    name: payload.name,
    legal_name: payload.legalName ?? null,
    legal_form: payload.legalForm ?? null,
    siret: payload.siret ?? null,
    vat_number: payload.vatNumber ?? null,
    street_address: payload.streetAddress ?? null,
    postal_code: payload.postalCode ?? null,
    city: payload.city ?? null,
    country: payload.country ?? 'France',
    contact_email: payload.contactEmail ?? null,
    contact_phone: payload.contactPhone ?? null,
    contact_email_public: Boolean(payload.contactEmailPublic),
    contact_phone_public: Boolean(payload.contactPhonePublic),
    website: payload.website ?? null,
    linkedin_url: payload.linkedinUrl ?? null,
    description: payload.description ?? null,
    industry: payload.industry ?? null,
    scale_size: payload.scaleSize ?? null,
    founded_year: payload.foundedYear ?? null,
  };
}

async function getCompanyById(companyId) {
  const company = await Company.findByPk(companyId);

  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  return formatCompany(company);
}

async function listCompaniesForRecruiter(recruiter) {
  const company = await Company.findByPk(recruiter.company_id);
  return company ? [formatCompany(company)] : [];
}

async function createCompany({ userId, payload }) {
  const existingProfile = await RecruiterProfile.findOne({ where: { user_id: userId } });

  if (existingProfile) {
    throw ApiError.conflict('You are already linked to a company');
  }

  const user = await User.findByPk(userId);

  if (!user || user.role !== USER_ROLES.RECRUITER) {
    throw ApiError.forbidden('Only recruiter accounts can create companies');
  }

  const transaction = await sequelize.transaction();

  try {
    const company = await Company.create(
      {
        id: generateUuid(),
        logo_url: null,
        created_at: new Date(),
        ...companyAttributesFromPayload(payload),
      },
      { transaction }
    );

    await RecruiterProfile.create(
      {
        id: generateUuid(),
        user_id: userId,
        company_id: company.id,
        job_title: payload.ownerJobTitle || null,
        phone: payload.ownerPhone || null,
        company_role: COMPANY_ROLES.OWNER,
        can_post_job: true,
        can_decide_application: true,
        can_edit_company: true,
        updated_at: new Date(),
      },
      { transaction }
    );

    await subscriptionService.createMockSubscription(company.id, 'starter', { transaction });

    await transaction.commit();

    return formatCompany(company);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function updateCompany({ companyId, recruiter, payload }) {
  const company = await Company.findByPk(companyId);

  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  if (recruiter && recruiter.company_id !== companyId) {
    throw ApiError.forbidden('You can only update your own company');
  }

  const updates = {};
  const map = {
    name: 'name',
    legalName: 'legal_name',
    legalForm: 'legal_form',
    siret: 'siret',
    vatNumber: 'vat_number',
    streetAddress: 'street_address',
    postalCode: 'postal_code',
    city: 'city',
    country: 'country',
    contactEmail: 'contact_email',
    contactPhone: 'contact_phone',
    contactEmailPublic: 'contact_email_public',
    contactPhonePublic: 'contact_phone_public',
    website: 'website',
    linkedinUrl: 'linkedin_url',
    description: 'description',
    industry: 'industry',
    scaleSize: 'scale_size',
    foundedYear: 'founded_year',
  };

  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      updates[column] = payload[key];
    }
  }

  if (Object.keys(updates).length) {
    await company.update(updates);
  }

  return formatCompany(company);
}

async function deleteCompany({ companyId, recruiter }) {
  const company = await Company.findByPk(companyId);

  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  if (recruiter.company_id !== companyId) {
    throw ApiError.forbidden('You can only delete your own company');
  }

  if (recruiter.company_role !== COMPANY_ROLES.OWNER) {
    throw ApiError.forbidden('Only the company owner can delete the company');
  }

  if (company.logo_url) {
    await deleteLogoFile(company.logo_url);
  }

  await company.destroy();

  return { message: 'Company deleted successfully' };
}

async function updateCompanyLogo({ companyId, recruiter, file }) {
  if (!file) {
    throw ApiError.badRequest('Logo file is required');
  }

  const company = await Company.findByPk(companyId);

  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  if (recruiter && recruiter.company_id !== companyId) {
    throw ApiError.forbidden('You can only update your own company logo');
  }

  const previousLogoUrl = company.logo_url;
  const newLogoUrl = buildLogoPublicUrl(file.filename);

  await company.update({ logo_url: newLogoUrl });

  if (previousLogoUrl) {
    await deleteLogoFile(previousLogoUrl);
  }

  return formatCompany(company);
}

module.exports = {
  getCompanyById,
  listCompaniesForRecruiter,
  createCompany,
  updateCompany,
  deleteCompany,
  updateCompanyLogo,
  formatCompany,
};
