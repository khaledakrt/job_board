'use strict';

const { Op, Sequelize } = require('sequelize');
const { Job, Company } = require('../models');
const { JOB_STATUS, JOB_PUBLIC_STATUSES } = require('../config/constants');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildPaginatedResponse } = require('../utils/pagination');
const { expireDueJobs } = require('../utils/jobExpiration');
const { formatQuizForCandidate } = require('../utils/jobQuiz');
const { sanitizeRichText } = require('../utils/richText');

function formatPublicJob(job) {
  return {
    id: job.id,
    title: job.title,
    description: sanitizeRichText(job.description),
    requirements: sanitizeRichText(job.requirements),
    tags: job.tags,
    languages: job.languages,
    benefits: job.benefits,
    experienceYears: job.experience_years,
    location: job.location,
    remoteType: job.remote_type,
    contractType: job.contract_type,
    salaryLabel: job.salary_label,
    salaryMin: job.salary_min != null ? Number(job.salary_min) : null,
    salaryMax: job.salary_max != null ? Number(job.salary_max) : null,
    salaryCurrency: job.salary_currency,
    salaryPeriod: job.salary_period,
    status: job.status,
    viewsCount: job.views_count,
    applicationsCount: job.applications_count,
    expiresAt: job.expires_at,
    quizEnabled: Boolean(job.quiz_enabled) && Boolean(job.quiz_data),
    quiz:
      job.quiz_enabled && job.quiz_data
        ? formatQuizForCandidate(job.quiz_data)
        : null,
    createdAt: job.created_at,
    company: job.company
      ? {
          id: job.company.id,
          name: job.company.name,
          logoUrl: job.company.logo_url,
          industry: job.company.industry,
          city: job.company.city,
          website: job.company.website,
          description: job.company.description,
        }
      : null,
  };
}

function buildSearchWhereClause(filters) {
  const where = {
    status: { [Op.in]: [...JOB_PUBLIC_STATUSES] },
    expires_at: { [Op.gt]: new Date() },
  };

  if (filters.location) {
    where.location = {
      [Op.like]: `%${filters.location}%`,
    };
  }

  const contractTypes = filters.contracts?.length
    ? filters.contracts
    : filters.contractType
      ? [filters.contractType]
      : [];
  if (contractTypes.length) {
    where.contract_type = { [Op.in]: contractTypes };
  }

  const remoteTypes = filters.remotes?.length
    ? filters.remotes
    : filters.remoteType
      ? [filters.remoteType]
      : [];
  if (remoteTypes.length) {
    where.remote_type = { [Op.in]: remoteTypes };
  }

  if (filters.quizOnly) {
    where.quiz_enabled = true;
  }

  if (filters.experience === 'junior') {
    where.experience_years = { [Op.lte]: 2 };
  } else if (filters.experience === 'mid') {
    where.experience_years = { [Op.between]: [3, 5] };
  } else if (filters.experience === 'senior') {
    where.experience_years = { [Op.gte]: 6 };
  }

  if (filters.minSalary != null && filters.minSalary > 0) {
    const min = Math.floor(filters.minSalary);
    const salaryCondition = {
      [Op.or]: [
        { salary_max: { [Op.gte]: min } },
        {
          [Op.and]: [
            { salary_max: null },
            { salary_min: { [Op.gte]: min } },
          ],
        },
      ],
    };
    if (where[Op.and]) {
      where[Op.and].push(salaryCondition);
    } else {
      where[Op.and] = [salaryCondition];
    }
  }

  if (filters.keywords) {
    const keyword = filters.keywords.trim();
    const likeKeyword = `%${keyword}%`;

    const keywordCondition = {
      [Op.or]: [
        { title: { [Op.like]: likeKeyword } },
        { description: { [Op.like]: likeKeyword } },
        { requirements: { [Op.like]: likeKeyword } },
        { location: { [Op.like]: likeKeyword } },
        { salary_label: { [Op.like]: likeKeyword } },
        Sequelize.literal(
          `CAST(COALESCE(tags, JSON_ARRAY()) AS CHAR) LIKE ${Job.sequelize.escape(`%${keyword}%`)}`
        ),
        Sequelize.literal(
          `CAST(COALESCE(languages, JSON_ARRAY()) AS CHAR) LIKE ${Job.sequelize.escape(`%${keyword}%`)}`
        ),
        Sequelize.literal(
          `CAST(COALESCE(benefits, JSON_ARRAY()) AS CHAR) LIKE ${Job.sequelize.escape(`%${keyword}%`)}`
        ),
      ],
    };

    if (where[Op.and]) {
      where[Op.and].push(keywordCondition);
    } else {
      where[Op.and] = [keywordCondition];
    }
  }

  return where;
}

function buildCompanyWhereClause(filters) {
  const where = {};

  if (filters.company) {
    where.name = { [Op.like]: `%${filters.company.trim()}%` };
  }

  if (filters.industry) {
    where.industry = { [Op.like]: `%${filters.industry.trim()}%` };
  }

  return where;
}

async function searchJobs(query) {
  await expireDueJobs();

  const { page, limit, offset } = parsePagination(query);

  const filters = {
    keywords: query.keywords,
    location: query.location,
    company: query.company,
    industry: query.industry,
    contractType: query.contractType,
    remoteType: query.remoteType,
    contracts: query.contracts,
    remotes: query.remotes,
    experience: query.experience,
    quizOnly: query.quizOnly,
    minSalary: query.minSalary,
  };

  const where = buildSearchWhereClause(filters);
  const companyWhere = buildCompanyWhereClause(filters);
  const hasCompanyFilters = Object.keys(companyWhere).length > 0;

  const order =
    query.sortBy === 'salary'
      ? [
          ['salary_max', 'DESC'],
          ['salary_min', 'DESC'],
          ['created_at', 'DESC'],
        ]
      : query.sortBy === 'experience'
        ? [
            ['experience_years', 'DESC'],
            ['created_at', 'DESC'],
          ]
        : [
            ['created_at', 'DESC'],
            ['applications_count', 'DESC'],
          ];

  const { rows, count } = await Job.findAndCountAll({
    where,
    include: [
      {
        model: Company,
        as: 'company',
        attributes: ['id', 'name', 'logo_url', 'industry', 'city', 'website', 'description'],
        where: hasCompanyFilters ? companyWhere : undefined,
        required: hasCompanyFilters,
      },
    ],
    order,
    limit,
    offset,
    distinct: true,
  });

  const items = rows.map(formatPublicJob);

  return buildPaginatedResponse({
    rows: items,
    count,
    page,
    limit,
  });
}

async function getPublicJobById(jobId) {
  await expireDueJobs();

  const job = await Job.findOne({
    where: {
      id: jobId,
      status: JOB_STATUS.ACTIVE,
      expires_at: { [Op.gt]: new Date() },
    },
    include: [
      {
        model: Company,
        as: 'company',
        attributes: ['id', 'name', 'logo_url', 'website', 'industry', 'description'],
      },
    ],
  });

  if (!job) {
    throw ApiError.notFound('Job not found or no longer active');
  }

  await job.increment('views_count', { by: 1 });

  return formatPublicJob(job);
}

async function getPublicJobPreviewById(jobId) {
  await expireDueJobs();

  const job = await Job.findOne({
    where: {
      id: jobId,
      status: JOB_STATUS.ACTIVE,
      expires_at: { [Op.gt]: new Date() },
    },
    include: [
      {
        model: Company,
        as: 'company',
        attributes: [
          'id',
          'name',
          'logo_url',
          'website',
          'industry',
          'description',
          'street_address',
          'postal_code',
          'city',
          'country',
        ],
      },
    ],
  });

  if (!job) {
    throw ApiError.notFound('Job not found or no longer active');
  }

  return formatPublicJob(job);
}

module.exports = {
  searchJobs,
  getPublicJobById,
  getPublicJobPreviewById,
  formatPublicJob,
};
