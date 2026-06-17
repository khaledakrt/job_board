'use strict';

const { Op } = require('sequelize');
const { SavedJob, Job, Company } = require('../models');
const ApiError = require('../utils/ApiError');
const { generateUuid } = require('../utils/uuid');
const { CANDIDATE_LIMITS, JOB_PUBLIC_STATUSES } = require('../config/constants');
const { expireDueJobs } = require('../utils/jobExpiration');

function formatSavedJob(savedJob) {
  const job = savedJob.job;
  return {
    id: savedJob.id,
    jobId: savedJob.job_id,
    createdAt: savedJob.created_at,
    job: job
      ? {
          id: job.id,
          title: job.title,
          location: job.location,
          remoteType: job.remote_type,
          contractType: job.contract_type,
          salaryLabel: job.salary_label,
          languages: job.languages,
          experienceYears: job.experience_years,
          status: job.status,
          company: job.company
            ? {
                id: job.company.id,
                name: job.company.name,
                logoUrl: job.company.logo_url,
              }
            : null,
        }
      : null,
  };
}

async function listSavedJobs(candidateId) {
  const saved = await SavedJob.findAll({
    where: { candidate_id: candidateId },
    include: [
      {
        model: Job,
        as: 'job',
        include: [{ model: Company, as: 'company' }],
      },
    ],
    order: [['created_at', 'DESC']],
  });

  return saved.map(formatSavedJob);
}

async function saveJob({ candidateId, jobId }) {
  await expireDueJobs({ id: jobId }, { force: true });

  const job = await Job.findOne({
    where: {
      id: jobId,
      status: { [Op.in]: [...JOB_PUBLIC_STATUSES] },
      expires_at: { [Op.gt]: new Date() },
    },
  });
  if (!job) {
    throw ApiError.notFound('Job not found');
  }

  const existing = await SavedJob.findOne({
    where: { candidate_id: candidateId, job_id: jobId },
  });

  if (existing) {
    throw ApiError.conflict('Job already saved');
  }

  const savedCount = await SavedJob.count({ where: { candidate_id: candidateId } });
  if (savedCount >= CANDIDATE_LIMITS.MAX_SAVED_JOBS) {
    throw ApiError.conflict(
      `Vous ne pouvez pas enregistrer plus de ${CANDIDATE_LIMITS.MAX_SAVED_JOBS} offres. Retirez une offre pour en ajouter une autre.`
    );
  }

  const saved = await SavedJob.create({
    id: generateUuid(),
    candidate_id: candidateId,
    job_id: jobId,
    created_at: new Date(),
  });

  const full = await SavedJob.findByPk(saved.id, {
    include: [{ model: Job, as: 'job', include: [{ model: Company, as: 'company' }] }],
  });

  return formatSavedJob(full);
}

async function removeSavedJob({ candidateId, savedJobId }) {
  const saved = await SavedJob.findOne({
    where: { id: savedJobId, candidate_id: candidateId },
  });

  if (!saved) {
    throw ApiError.notFound('Saved job not found');
  }

  await saved.destroy();
  return { message: 'Job removed from saved list' };
}

module.exports = {
  listSavedJobs,
  saveJob,
  removeSavedJob,
};
