'use strict';

const { Application, Job, Company, CandidateProfile, ApplicationNote } = require('../models');
const sequelize = require('../database/sequelize');
const ApiError = require('../utils/ApiError');
const { JOB_STATUS, APPLICATION_STATUS } = require('../config/constants');
const { generateUuid } = require('../utils/uuid');
const { copyResumeToSnapshot } = require('../utils/fileStorage');
const { generateCoverLetter } = require('../utils/coverLetterGenerator');
const { validateQuizAnswers, buildQuizReview } = require('../utils/jobQuiz');
const recruiterNotificationService = require('./recruiterNotification.service');
const { isArchivedApplication } = require('./candidateDashboard.service');
const logger = require('../utils/logger');

function formatApplication(application) {
  return {
    id: application.id,
    jobId: application.job_id,
    candidateId: application.candidate_id,
    status: application.status,
    coverLetter: application.cover_letter,
    resumeSnapshotUrl: application.resume_snapshot_url,
    rating: application.rating,
    interviewAt: application.interview_at,
    createdAt: application.created_at,
    updatedAt: application.updated_at,
    job: application.job
      ? {
          id: application.job.id,
          title: application.job.title,
          location: application.job.location,
          remoteType: application.job.remote_type,
          contractType: application.job.contract_type,
          company: application.job.company
            ? {
                id: application.job.company.id,
                name: application.job.company.name,
                logoUrl: application.job.company.logo_url,
              }
            : null,
        }
      : null,
  };
}

async function listCandidateApplications(candidateId, filters = {}) {
  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 8, 1), 25);

  const applications = await Application.findAll({
    where: { candidate_id: candidateId },
    include: [
      {
        model: Job,
        as: 'job',
        attributes: [
          'id',
          'title',
          'location',
          'remote_type',
          'contract_type',
          'quiz_enabled',
          'quiz_data',
        ],
        include: [{ model: Company, as: 'company' }],
      },
    ],
    order: [['updated_at', 'DESC']],
  });

  let list = applications.map(formatApplication);

  const scope = filters.scope || 'active';
  if (scope === 'active') {
    list = list.filter((_, i) => !isArchivedApplication(applications[i]));
  } else if (scope === 'archived') {
    list = list.filter((_, i) => isArchivedApplication(applications[i]));
  }

  if (filters.status) {
    list = list.filter((a) => a.status === filters.status);
  }

  const q = (filters.q || '').trim().toLowerCase();
  if (q) {
    list = list.filter((a) => {
      const title = (a.job?.title || '').toLowerCase();
      const company = (a.job?.company?.name || '').toLowerCase();
      return title.includes(q) || company.includes(q);
    });
  }

  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const items = list.slice(start, start + limit);

  return {
    items,
    pagination: {
      page: safePage,
      limit,
      totalItems,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    },
  };
}

async function listAppliedJobIds(candidateId) {
  const applications = await Application.findAll({
    where: { candidate_id: candidateId },
    attributes: ['job_id'],
  });
  return applications.map((a) => a.job_id);
}

async function applyToJob({ candidate, jobId, coverLetter, quizAnswers }) {
  const job = await Job.findOne({
    where: {
      id: jobId,
      status: JOB_STATUS.ACTIVE,
    },
    include: [{ model: Company, as: 'company' }],
  });

  if (!job) {
    throw ApiError.notFound('Job not found or no longer accepting applications');
  }

  if (!candidate.resume_url) {
    throw ApiError.badRequest(
      'Ajoutez un CV sur votre profil (import PDF ou génération depuis le profil manuel) avant de postuler.'
    );
  }

  const existingApplication = await Application.findOne({
    where: {
      job_id: jobId,
      candidate_id: candidate.id,
    },
  });

  if (existingApplication) {
    throw ApiError.conflict('Vous avez déjà postulé à cette offre');
  }

  let storedQuizAnswers = null;
  if (job.quiz_enabled) {
    const quizCheck = validateQuizAnswers(job.quiz_data, quizAnswers);
    if (!quizCheck.ok) {
      throw ApiError.badRequest(quizCheck.message);
    }
    storedQuizAnswers = quizCheck.stored;
  } else if (quizAnswers?.length) {
    throw ApiError.badRequest('This job does not require a quiz');
  }

  const resumeSnapshotUrl = await copyResumeToSnapshot(candidate.resume_url);

  let application;

  try {
    application = await sequelize.transaction(async (transaction) => {
      const duplicate = await Application.findOne({
        where: {
          job_id: jobId,
          candidate_id: candidate.id,
        },
        transaction,
        lock: true,
      });

      if (duplicate) {
        throw ApiError.conflict('Vous avez déjà postulé à cette offre');
      }

      const created = await Application.create(
        {
          id: generateUuid(),
          job_id: jobId,
          candidate_id: candidate.id,
          status: APPLICATION_STATUS.APPLIED,
          cover_letter: coverLetter || null,
          quiz_answers: storedQuizAnswers,
          resume_snapshot_url: resumeSnapshotUrl,
          rating: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        { transaction }
      );

      await job.increment('applications_count', { by: 1, transaction });

      return created;
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw ApiError.conflict('Vous avez déjà postulé à cette offre');
    }
    throw error;
  }

  try {
    await recruiterNotificationService.notifyNewApplication({
      application,
      job,
      candidate,
    });
  } catch (error) {
    logger.warn(`[CandidateApplication] recruiter notification failed: ${error.message}`);
  }

  return {
    application: formatApplication(application),
    job: {
      id: job.id,
      title: job.title,
      companyName: job.company?.name,
    },
  };
}

async function getCandidateApplicationDetail({ candidateId, applicationId }) {
  const application = await Application.findOne({
    where: { id: applicationId, candidate_id: candidateId },
    include: [
      {
        model: Job,
        as: 'job',
        attributes: [
          'id',
          'title',
          'location',
          'remote_type',
          'contract_type',
          'quiz_enabled',
          'quiz_data',
        ],
        include: [{ model: Company, as: 'company' }],
      },
      {
        model: ApplicationNote,
        as: 'notes',
        where: { visible_to_candidate: true },
        required: false,
        separate: true,
        order: [['created_at', 'DESC']],
      },
    ],
  });

  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  const formatted = formatApplication(application);
  const quizReview =
    application.job?.quiz_enabled && application.quiz_answers?.length
      ? buildQuizReview(application.job.quiz_data, application.quiz_answers)
      : null;

  return {
    ...formatted,
    quizAnswers: application.quiz_answers ?? null,
    quizReview,
    notes: (application.notes || []).map((note) => ({
      id: note.id,
      authorId: note.author_id,
      noteText: note.note_text,
      createdAt: note.created_at,
    })),
  };
}

async function generateApplicationLetter({ candidate, jobId }) {
  const job = await Job.findOne({
    where: {
      id: jobId,
      status: JOB_STATUS.ACTIVE,
    },
    include: [{ model: Company, as: 'company' }],
  });

  if (!job) {
    throw ApiError.notFound('Job not found or not active');
  }

  const letter = generateCoverLetter({
    candidate,
    job,
    company: job.company,
  });

  return letter;
}

module.exports = {
  listCandidateApplications,
  listAppliedJobIds,
  getCandidateApplicationDetail,
  applyToJob,
  generateApplicationLetter,
  formatApplication,
};
