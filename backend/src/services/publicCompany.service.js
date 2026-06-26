'use strict';

const { Op } = require('sequelize');
const { Job, Company } = require('../models');
const { JOB_PUBLIC_STATUSES } = require('../config/constants');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildPaginatedResponse } = require('../utils/pagination');
const { expireDueJobs } = require('../utils/jobExpiration');
const { formatPublicJob } = require('./publicJobSearch.service');

function formatPublicCompany(company) {
  const locationParts = [company.city, company.country].filter(Boolean);

  return {
    id: company.id,
    name: company.name,
    logoUrl: company.logo_url,
    website: company.website,
    linkedinUrl: company.linkedin_url,
    description: company.description,
    industry: company.industry,
    scaleSize: company.scale_size,
    foundedYear: company.founded_year,
    city: company.city,
    country: company.country,
    locationLabel: locationParts.length ? locationParts.join(', ') : null,
    contactEmail: company.contact_email_public ? company.contact_email : null,
    contactPhone: company.contact_phone_public ? company.contact_phone : null,
  };
}

async function getPublicCompanyProfile(companyId, query = {}) {
  await expireDueJobs();

  const company = await Company.findByPk(companyId);
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  const { page, limit, offset } = parsePagination(query);

  const { rows, count } = await Job.findAndCountAll({
    where: {
      company_id: companyId,
      status: { [Op.in]: [...JOB_PUBLIC_STATUSES] },
      expires_at: { [Op.gt]: new Date() },
    },
    include: [
      {
        model: Company,
        as: 'company',
        attributes: ['id', 'name', 'logo_url', 'industry'],
      },
    ],
    order: [
      ['created_at', 'DESC'],
      ['applications_count', 'DESC'],
    ],
    limit,
    offset,
    distinct: true,
  });

  const paginated = buildPaginatedResponse({
    rows: rows.map(formatPublicJob),
    count,
    page,
    limit,
  });

  return {
    company: formatPublicCompany(company),
    jobs: paginated.items,
    pagination: paginated.pagination,
  };
}

async function listPublicCompanies(query = {}) {
  await expireDueJobs();

  const { page, limit, offset } = parsePagination(query);
  const companyWhere = {};
  const search = query.search?.trim();
  const city = query.city?.trim();
  const industry = query.industry?.trim();

  if (search) {
    companyWhere[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
      { industry: { [Op.like]: `%${search}%` } },
      { city: { [Op.like]: `%${search}%` } },
    ];
  }
  if (city) companyWhere.city = { [Op.like]: `%${city}%` };
  if (industry) companyWhere.industry = { [Op.like]: `%${industry}%` };

  const { rows, count } = await Company.findAndCountAll({
    where: companyWhere,
    order: [['name', 'ASC']],
    limit,
    offset,
  });

  const items = await Promise.all(
    rows.map(async (company) => {
      const jobWhere = {
        company_id: company.id,
        status: { [Op.in]: [...JOB_PUBLIC_STATUSES] },
        expires_at: { [Op.gt]: new Date() },
      };
      const [jobs, jobsCount] = await Promise.all([
        Job.findAll({
          where: jobWhere,
          include: [
            {
              model: Company,
              as: 'company',
              attributes: ['id', 'name', 'logo_url', 'industry', 'city', 'website', 'description'],
            },
          ],
          order: [['created_at', 'DESC']],
          limit: 12,
        }),
        Job.count({ where: jobWhere }),
      ]);

      return {
        ...formatPublicCompany(company),
        jobs: jobs.map(formatPublicJob),
        jobsCount,
        cities: [...new Set([company.city, ...jobs.map((job) => job.location)].filter(Boolean))],
      };
    })
  );

  return buildPaginatedResponse({
    rows: items,
    count,
    page,
    limit,
  });
}

module.exports = {
  listPublicCompanies,
  getPublicCompanyProfile,
  formatPublicCompany,
};
