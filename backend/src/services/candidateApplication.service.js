'use strict';

const { Op } = require('sequelize');
const { Application, Job, Company, CandidateProfile, ApplicationNote } = require('../models');
const sequelize = require('../database/sequelize');
const ApiError = require('../utils/ApiError');
const { JOB_STATUS, APPLICATION_STATUS } = require('../config/constants');
const { generateUuid } = require('../utils/uuid');
const { copyResumeToSnapshot, deleteSnapshotFile } = require('../utils/fileStorage');
const { generateCoverLetter } = require('../utils/coverLetterGenerator');
const { validateQuizAnswers, buildQuizReview } = require('../utils/jobQuiz');
const recruiterNotificationService = require('./recruiterNotification.service');
const { ARCHIVE_MONTHS } = require('./candidateDashboard.service');
const { expireDueJobs } = require('../utils/jobExpiration');
const logger = require('../utils/logger');

const MAX_INTERVIEW_ROUNDS = 3;

function formatApplication(application) {
  const isInterview = application.status === APPLICATION_STATUS.INTERVIEW;
  return {
    id: application.id,
    jobId: application.job_id,
    candidateId: application.candidate_id,
    status: application.status,
    coverLetter: application.cover_letter,
    resumeSnapshotUrl: application.resume_snapshot_url,
    rating: application.rating,
    interviewAt: isInterview ? application.interview_at : null,
    interviewRound: isInterview ? application.interview_round : 0,
    maxInterviewRounds: MAX_INTERVIEW_ROUNDS,
    interviewResponseStatus: isInterview ? application.interview_response_status : null,
    interviewResponseMessage: isInterview ? application.interview_response_message : null,
    interviewResponseAvailability: isInterview ? application.interview_response_availability : null,
    interviewRespondedAt: isInterview ? application.interview_responded_at : null,
    candidateArchivedAt: application.candidate_archived_at,
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
  const offset = (page - 1) * limit;
  const where = { candidate_id: candidateId };
  const scope = filters.scope || 'active';
  const archiveCutoff = new Date();
  archiveCutoff.setMonth(archiveCutoff.getMonth() - ARCHIVE_MONTHS);

  if (scope === 'active') {
    where.candidate_archived_at = null;
    where[Op.or] = [
      { status: { [Op.ne]: APPLICATION_STATUS.REJECTED } },
      { updated_at: { [Op.gte]: archiveCutoff } },
    ];
  } else if (scope === 'archived') {
    where.status = APPLICATION_STATUS.REJECTED;
    where[Op.or] = [
      { updated_at: { [Op.lt]: archiveCutoff } },
      { candidate_archived_at: { [Op.ne]: null } },
    ];
  }

  if (filters.status) {
    where.status = filters.status;
  }

  const q = (filters.q || '').trim();
  if (q) {
    const searchCondition = {
      [Op.or]: [
        { '$job.title$': { [Op.like]: `%${q}%` } },
        { '$job.company.name$': { [Op.like]: `%${q}%` } },
      ],
    };
    where[Op.and] = where[Op.and] ? [...where[Op.and], searchCondition] : [searchCondition];
  }

  const { rows, count } = await Application.findAndCountAll({
    where,
    include: [
      {
        model: Job,
        as: 'job',
        required: Boolean(q),
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
    limit,
    offset,
    distinct: true,
    subQuery: false,
  });

  const totalItems = count;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return {
    items: rows.map(formatApplication),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
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

async function archiveRejectedApplication({ candidateId, applicationId }) {
  const application = await Application.findOne({
    where: { id: applicationId, candidate_id: candidateId },
  });

  if (!application) {
    throw ApiError.notFound('Application not found');
  }
  if (application.status !== APPLICATION_STATUS.REJECTED) {
    throw ApiError.badRequest('Seules les candidatures refusées peuvent être masquées.');
  }

  await application.update({
    candidate_archived_at: application.candidate_archived_at || new Date(),
    updated_at: new Date(),
  });

  return formatApplication(application);
}

async function respondToInterview({ candidate, applicationId, status, message, proposedAvailability }) {
  const application = await Application.findOne({
    where: { id: applicationId, candidate_id: candidate.id },
    include: [
      {
        model: Job,
        as: 'job',
        include: [{ model: Company, as: 'company' }],
      },
    ],
  });

  if (!application) {
    throw ApiError.notFound('Application not found');
  }
  if (application.status !== APPLICATION_STATUS.INTERVIEW || !application.interview_at) {
    throw ApiError.badRequest('Vous pouvez répondre uniquement à une proposition d’entretien.');
  }
  if (Number(application.interview_round || 0) >= MAX_INTERVIEW_ROUNDS && status === 'reschedule_requested') {
    throw ApiError.badRequest(
      'La limite d’échanges pour cet entretien est atteinte. Contactez directement le recruteur si nécessaire.'
    );
  }

  const cleanMessage = message?.trim() || null;
  const cleanAvailability = proposedAvailability?.trim() || null;
  if (status === 'reschedule_requested' && !cleanMessage) {
    throw ApiError.badRequest('Expliquez vos disponibilités ou la raison du changement demandé.');
  }

  await application.update({
    interview_response_status: status,
    interview_response_message: cleanMessage,
    interview_response_availability: cleanAvailability,
    interview_responded_at: new Date(),
    updated_at: new Date(),
  });

  try {
    await recruiterNotificationService.notifyInterviewResponse({
      application,
      job: application.job,
      candidate,
      responseStatus: status,
      message: cleanMessage || cleanAvailability,
    });
  } catch (error) {
    logger.warn(`[CandidateApplication] interview response notification failed: ${error.message}`);
  }

  return formatApplication(application);
}

async function applyToJob({ candidate, jobId, coverLetter, quizAnswers }) {
  await expireDueJobs({ id: jobId }, { force: true });

  const job = await Job.findOne({
    where: {
      id: jobId,
      status: JOB_STATUS.ACTIVE,
      expires_at: { [Op.gt]: new Date() },
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
    if (resumeSnapshotUrl) {
      await deleteSnapshotFile(resumeSnapshotUrl);
    }
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
  await expireDueJobs({ id: jobId }, { force: true });

  const job = await Job.findOne({
    where: {
      id: jobId,
      status: JOB_STATUS.ACTIVE,
      expires_at: { [Op.gt]: new Date() },
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
  archiveRejectedApplication,
  respondToInterview,
  getCandidateApplicationDetail,
  applyToJob,
  generateApplicationLetter,
  formatApplication,
};
