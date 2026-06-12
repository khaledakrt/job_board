'use strict';

const { Job, Company, RecruiterProfile } = require('../models');
const { Op } = require('sequelize');
const { JOB_STATUS } = require('../config/constants');
const ApiError = require('../utils/ApiError');
const { generateUuid } = require('../utils/uuid');
const { parsePagination, buildPaginatedResponse } = require('../utils/pagination');
const {
  defaultExpiresAt,
  parseExpiresAt,
  expireDueJobs,
} = require('../utils/jobExpiration');
const {
  normalizeQuizData,
  validateQuizForSave,
  formatQuizForRecruiter,
} = require('../utils/jobQuiz');
const { generateJobQuiz } = require('../utils/quizGenerator');

function formatJob(job) {
  return {
    id: job.id,
    companyId: job.company_id,
    recruiterId: job.recruiter_id,
    title: job.title,
    description: job.description,
    requirements: job.requirements,
    tags: job.tags,
    languages: job.languages,
    benefits: job.benefits,
    experienceYears: job.experience_years,
    location: job.location,
    remoteType: job.remote_type,
    contractType: job.contract_type,
    salaryLabel: job.salary_label,
    status: job.status,
    expiresAt: job.expires_at,
    viewsCount: job.views_count,
    applicationsCount: job.applications_count,
    archivedAt: job.archived_at,
    archivedBy: job.archived_by,
    deletedByRecruiterAt: job.deleted_by_recruiter_at,
    quizEnabled: Boolean(job.quiz_enabled),
    quiz: job.quiz_enabled ? formatQuizForRecruiter(job.quiz_data) : null,
    createdAt: job.created_at,
    company: job.company
      ? {
          id: job.company.id,
          name: job.company.name,
          logoUrl: job.company.logo_url,
        }
      : undefined,
  };
}

async function assertJobBelongsToCompany(jobId, companyId) {
  const job = await Job.findByPk(jobId, {
    include: [{ model: Company, as: 'company' }],
  });

  if (!job) {
    throw ApiError.notFound('Job not found');
  }

  if (job.company_id !== companyId) {
    throw ApiError.forbidden('Job does not belong to your company');
  }

  return job;
}

async function listCompanyJobs(companyId, query = {}) {
  await expireDueJobs({ company_id: companyId });

  const where = { company_id: companyId, deleted_by_recruiter_at: null };

  if (query.archived === true || query.archived === 'true') {
    where.status = { [Op.in]: [JOB_STATUS.HIDDEN, JOB_STATUS.EXPIRED] };
  } else if (query.status) {
    where.status = query.status;
  } else {
    where.status = { [Op.notIn]: [JOB_STATUS.HIDDEN, JOB_STATUS.EXPIRED] };
  }

  const { page, limit, offset } = parsePagination(query);

  const { rows, count } = await Job.findAndCountAll({
    where,
    include: [{ model: Company, as: 'company' }],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  return buildPaginatedResponse({
    rows: rows.map(formatJob),
    count,
    page,
    limit,
  });
}

async function getJobById(jobId, companyId) {
  await expireDueJobs({ company_id: companyId });
  const job = await assertJobBelongsToCompany(jobId, companyId);
  return formatJob(job);
}

function resolveQuizFields(payload) {
  const quizEnabled = Boolean(payload.quizEnabled);
  if (!quizEnabled) {
    return { quiz_enabled: false, quiz_data: null };
  }

  const quizData = normalizeQuizData(payload.quiz);
  const validationError = validateQuizForSave(quizData);
  if (validationError) {
    throw ApiError.badRequest(validationError);
  }

  return { quiz_enabled: true, quiz_data: quizData };
}

async function generateQuizFromJobContent(payload) {
  return generateJobQuiz({
    title: payload.title,
    description: payload.description,
    requirements: payload.requirements,
    tags: payload.tags,
    languages: payload.languages,
    benefits: payload.benefits,
  });
}

async function createJob({ recruiter, companyId, payload }) {
  const expiresAt = payload.expiresAt
    ? parseExpiresAt(payload.expiresAt)
    : defaultExpiresAt();

  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    throw ApiError.badRequest('Expiration date must be in the future');
  }

  const quizFields = resolveQuizFields(payload);

  const job = await Job.create({
    id: generateUuid(),
    company_id: companyId,
    recruiter_id: recruiter.id,
    title: payload.title,
    description: payload.description,
    requirements: payload.requirements || null,
    tags: payload.tags || null,
    languages: payload.languages || null,
    benefits: payload.benefits || null,
    experience_years: payload.experienceYears ?? null,
    location: payload.location || null,
    remote_type: payload.remoteType,
    contract_type: payload.contractType,
    salary_label: payload.salaryLabel ?? null,
    status: payload.status || JOB_STATUS.DRAFT,
    expires_at: expiresAt,
    views_count: 0,
    applications_count: 0,
    quiz_enabled: quizFields.quiz_enabled,
    quiz_data: quizFields.quiz_data,
    created_at: new Date(),
  });

  const full = await Job.findByPk(job.id, {
    include: [{ model: Company, as: 'company' }],
  });

  return formatJob(full);
}

async function updateJob({ jobId, companyId, payload }) {
  const job = await assertJobBelongsToCompany(jobId, companyId);

  if (job.status === JOB_STATUS.EXPIRED) {
    const editableFields = ['description', 'requirements', 'tags', 'languages', 'benefits'];
    const hasRestrictedUpdates = Object.keys(payload).some(
      (key) => !editableFields.includes(key) && payload[key] !== undefined
    );

    if (hasRestrictedUpdates) {
      throw ApiError.badRequest('Expired jobs only allow description, requirements, and tags updates');
    }
  } else if (payload.expiresAt !== undefined) {
    const expiresAt = parseExpiresAt(payload.expiresAt);
    if (!expiresAt || expiresAt.getTime() <= Date.now()) {
      throw ApiError.badRequest('Expiration date must be in the future');
    }
  }

  if (payload.status === JOB_STATUS.EXPIRED) {
    throw ApiError.badRequest('Job expiration is automatic based on the expiration date');
  }

  const quizUpdate = {};
  if (payload.quizEnabled !== undefined || payload.quiz !== undefined) {
    const quizPayload = {
      quizEnabled: payload.quizEnabled !== undefined ? payload.quizEnabled : job.quiz_enabled,
      quiz: payload.quiz !== undefined ? payload.quiz : job.quiz_data,
    };
    const quizFields = resolveQuizFields(quizPayload);
    quizUpdate.quiz_enabled = quizFields.quiz_enabled;
    quizUpdate.quiz_data = quizFields.quiz_data;
  }

  await job.update({
    title: payload.title ?? job.title,
    description: payload.description ?? job.description,
    requirements: payload.requirements ?? job.requirements,
    tags: payload.tags ?? job.tags,
    languages: payload.languages !== undefined ? payload.languages : job.languages,
    benefits: payload.benefits !== undefined ? payload.benefits : job.benefits,
    experience_years:
      payload.experienceYears !== undefined ? payload.experienceYears : job.experience_years,
    location: payload.location ?? job.location,
    remote_type: payload.remoteType ?? job.remote_type,
    contract_type: payload.contractType ?? job.contract_type,
    salary_label: payload.salaryLabel !== undefined ? payload.salaryLabel : job.salary_label,
    status: payload.status ?? job.status,
    expires_at:
      payload.expiresAt !== undefined && job.status !== JOB_STATUS.EXPIRED
        ? parseExpiresAt(payload.expiresAt)
        : job.expires_at,
    ...quizUpdate,
  });

  const updated = await Job.findByPk(job.id, {
    include: [{ model: Company, as: 'company' }],
  });

  return formatJob(updated);
}

async function updateJobStatus({ jobId, companyId, status, recruiterUserId }) {
  await expireDueJobs({ company_id: companyId });
  const job = await assertJobBelongsToCompany(jobId, companyId);

  if (job.status === JOB_STATUS.EXPIRED) {
    throw ApiError.badRequest('This job has expired and its visibility cannot be changed');
  }

  if (status === JOB_STATUS.EXPIRED) {
    throw ApiError.badRequest('Job expiration is automatic based on the expiration date');
  }

  const archiveFields =
    status === JOB_STATUS.HIDDEN
      ? {
          archived_at: job.archived_at || new Date(),
          archived_by: recruiterUserId || job.archived_by || null,
        }
      : {
          archived_at: null,
          archived_by: null,
          deleted_by_recruiter_at: null,
          deleted_by_recruiter_by: null,
        };

  await job.update({ status, ...archiveFields });

  return formatJob(job);
}

async function deleteJob({ jobId, companyId, recruiterUserId }) {
  const job = await assertJobBelongsToCompany(jobId, companyId);
  if (![JOB_STATUS.HIDDEN, JOB_STATUS.EXPIRED].includes(job.status)) {
    throw ApiError.badRequest('Archive the job before deleting it from recruiter history');
  }
  await job.update({
    deleted_by_recruiter_at: new Date(),
    deleted_by_recruiter_by: recruiterUserId,
    archived_at: job.archived_at || new Date(),
    archived_by: job.archived_by || recruiterUserId || null,
  });
  return { message: 'Job removed from recruiter archives' };
}

module.exports = {
  listCompanyJobs,
  getJobById,
  createJob,
  updateJob,
  updateJobStatus,
  deleteJob,
  formatJob,
  generateQuizFromJobContent,
};
