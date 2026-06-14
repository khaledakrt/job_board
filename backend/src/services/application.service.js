'use strict';

const { Application, Job, Company, CandidateProfile, ApplicationNote, User } = require('../models');
const sequelize = require('../database/sequelize');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const { generateUuid } = require('../utils/uuid');
const notificationService = require('./notification.service');
const { buildQuizReview } = require('../utils/jobQuiz');
const { parsePagination, buildPaginatedResponse } = require('../utils/pagination');
const logger = require('../utils/logger');

const ALLOWED_STATUS_TRANSITIONS = {
  applied: new Set(['applied', 'screening', 'interview', 'rejected']),
  screening: new Set(['screening', 'interview', 'offer', 'rejected']),
  interview: new Set(['interview', 'offer', 'rejected']),
  offer: new Set(['offer', 'rejected']),
  rejected: new Set(['rejected']),
};

const APPLICATION_STATUS = {
  INTERVIEW: 'interview',
};

function formatCandidate(candidate) {
  if (!candidate) return undefined;

  return {
    id: candidate.id,
    firstName: candidate.first_name,
    lastName: candidate.last_name,
    email: candidate.user?.email ?? null,
    phone: candidate.phone,
    avatarUrl: candidate.avatar_url,
    professionalTitle: candidate.professional_title,
    bio: candidate.bio,
    skills: candidate.skills,
    experiences: candidate.experiences,
    education: candidate.education,
    minSalary: candidate.min_salary,
  };
}

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
    archivedAt: application.archived_at,
    archivedBy: application.archived_by,
    deletedByRecruiterAt: application.deleted_by_recruiter_at,
    createdAt: application.created_at,
    updatedAt: application.updated_at,
    job: application.job
      ? {
          id: application.job.id,
          title: application.job.title,
          companyId: application.job.company_id,
        }
      : undefined,
    candidate: formatCandidate(application.candidate),
  };
}

const candidateInclude = {
  model: CandidateProfile,
  as: 'candidate',
  attributes: [
    'id',
    'first_name',
    'last_name',
    'phone',
    'avatar_url',
    'professional_title',
    'bio',
    'skills',
    'experiences',
    'education',
    'min_salary',
  ],
  include: [{ model: User, as: 'user', attributes: ['email'] }],
};

async function getApplicationForCompany(applicationId, companyId) {
  const application = await Application.findByPk(applicationId, {
    include: [
      {
        model: Job,
        as: 'job',
        attributes: [
          'id',
          'title',
          'company_id',
          'location',
          'remote_type',
          'contract_type',
          'quiz_enabled',
          'quiz_data',
        ],
        include: [{ model: Company, as: 'company' }],
      },
      candidateInclude,
    ],
  });

  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  if (!application.job || application.job.company_id !== companyId) {
    throw ApiError.forbidden('Application does not belong to your company');
  }

  return application;
}

async function updateApplicationStatus({
  applicationId,
  companyId,
  status,
  rating,
  evaluationText,
  internalNote,
  interviewAt,
  recruiterUser,
}) {
  const application = await getApplicationForCompany(applicationId, companyId);
  const previousStatus = application.status;

  if (!ALLOWED_STATUS_TRANSITIONS[previousStatus]?.has(status)) {
    throw ApiError.badRequest('Transition de statut non autorisée pour cette candidature');
  }

  const updates = {
    status,
    rating: rating ?? application.rating,
    updated_at: new Date(),
  };

  if (status === 'rejected') {
    updates.archived_at = application.archived_at || new Date();
    updates.archived_by = recruiterUser?.id || application.archived_by || null;
  } else if (application.archived_at) {
    updates.archived_at = null;
    updates.archived_by = null;
    updates.candidate_archived_at = null;
  }

  if (status === 'interview' && !interviewAt && !application.interview_at) {
    throw ApiError.badRequest('La date et l’heure de l’entretien sont obligatoires.');
  }

  if (interviewAt !== undefined) {
    if (!interviewAt && status === 'interview') {
      throw ApiError.badRequest('La date et l’heure de l’entretien sont obligatoires.');
    }
    const interviewDate = interviewAt ? new Date(interviewAt) : null;
    if (interviewDate && Number.isNaN(interviewDate.getTime())) {
      throw ApiError.badRequest('Date d’entretien invalide.');
    }
    if (status === 'interview' && interviewDate && interviewDate.getTime() <= Date.now()) {
      throw ApiError.badRequest('La date d’entretien doit être dans le futur.');
    }
    updates.interview_at = interviewDate;
  }

  if (status !== 'interview') {
    updates.interview_at = null;
  }

  await sequelize.transaction(async (transaction) => {
    await application.update(updates, { transaction });

    const noteText = buildStatusChangeNote({
      previousStatus,
      status,
      internalNote,
      interviewAt: updates.interview_at,
    });
    if (noteText) {
      await ApplicationNote.create(
        {
          id: generateUuid(),
          application_id: applicationId,
          author_id: recruiterUser.id,
          note_text: noteText,
          visible_to_candidate: false,
          created_at: new Date(),
        },
        { transaction }
      );
    }
    if (evaluationText && evaluationText.trim()) {
      await ApplicationNote.create(
        {
          id: generateUuid(),
          application_id: applicationId,
          author_id: recruiterUser.id,
          note_text: evaluationText.trim(),
          visible_to_candidate: true,
          created_at: new Date(),
        },
        { transaction }
      );
    }

    await application.reload({
      include: [
        { model: Job, as: 'job', include: [{ model: Company, as: 'company' }] },
        candidateInclude,
      ],
      transaction,
    });
  });

  const shouldNotify =
    previousStatus !== status || (evaluationText && evaluationText.trim().length > 0);

  let alertResult = null;

  if (shouldNotify) {
    try {
      alertResult = await notificationService.notifyApplicationStatusChange({
        application,
        previousStatus,
        newStatus: status,
        evaluationText: evaluationText || null,
        interviewAt: application.interview_at,
        recruiterUser,
      });
    } catch (error) {
      logger.warn(`[Application] status notification failed: ${error.message}`);
    }
  }

  return {
    application: formatApplication(application),
    alert: alertResult,
  };
}

function buildStatusChangeNote({ previousStatus, status, internalNote, interviewAt }) {
  const parts = [];
  if (previousStatus !== status) {
    parts.push(`Changement d'étape : ${previousStatus} -> ${status}`);
  }
  if (status === 'interview' && interviewAt) {
    parts.push(`Entretien planifié le ${new Date(interviewAt).toLocaleString('fr-FR')}`);
  }
  if (internalNote && internalNote.trim()) {
    parts.push(`Note interne recruteur :\n${internalNote.trim()}`);
  }
  return parts.length ? parts.join('\n\n') : null;
}

async function addApplicationNote({
  applicationId,
  companyId,
  authorId,
  noteText,
  recruiterUser,
}) {
  const application = await getApplicationForCompany(applicationId, companyId);

  const note = await sequelize.transaction((transaction) =>
    ApplicationNote.create(
      {
        id: generateUuid(),
        application_id: applicationId,
        author_id: authorId,
        note_text: noteText,
        created_at: new Date(),
      },
      { transaction }
    )
  );

  return {
    note: {
      id: note.id,
      applicationId: note.application_id,
      authorId: note.author_id,
      noteText: note.note_text,
      createdAt: note.created_at,
    },
    alert: null,
  };
}

async function listCompanyApplications(companyId, filters = {}) {
  const jobWhere = { company_id: companyId };

  if (filters.jobId) {
    jobWhere.id = filters.jobId;
  }

  const applicationWhere = {};

  if (filters.status) {
    applicationWhere.status = filters.status;
  }
  if (filters.archived === true || filters.archived === 'true') {
    applicationWhere.archived_at = { [Op.ne]: null };
    applicationWhere.deleted_by_recruiter_at = null;
  } else {
    applicationWhere.archived_at = null;
    applicationWhere.deleted_by_recruiter_at = null;
  }

  const { page, limit, offset } = parsePagination(filters);

  const { rows, count } = await Application.findAndCountAll({
    where: applicationWhere,
    include: [
      {
        model: Job,
        as: 'job',
        where: jobWhere,
        required: true,
        attributes: ['id', 'title', 'company_id', 'status'],
      },
      candidateInclude,
    ],
    order: [['updated_at', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  return buildPaginatedResponse({
    rows: rows.map(formatApplication),
    count,
    page,
    limit,
  });
}

async function restoreApplication({ applicationId, companyId }) {
  const application = await getApplicationForCompany(applicationId, companyId);
  if (!application.archived_at) {
    return formatApplication(application);
  }
  await application.update({
    status: 'screening',
    archived_at: null,
    archived_by: null,
    deleted_by_recruiter_at: null,
    deleted_by_recruiter_by: null,
    candidate_archived_at: null,
    updated_at: new Date(),
  });
  await application.reload({
    include: [
      { model: Job, as: 'job', include: [{ model: Company, as: 'company' }] },
      candidateInclude,
    ],
  });
  return formatApplication(application);
}

async function deleteArchivedApplication({ applicationId, companyId, recruiterUserId }) {
  const application = await getApplicationForCompany(applicationId, companyId);
  if (!application.archived_at) {
    throw ApiError.badRequest('Archive the application before deleting it from recruiter history');
  }
  await application.update({
    deleted_by_recruiter_at: new Date(),
    deleted_by_recruiter_by: recruiterUserId,
    updated_at: new Date(),
  });
  return { message: 'Application removed from recruiter archives' };
}

async function getApplicationDetail(applicationId, companyId) {
  const application = await Application.findByPk(applicationId, {
    include: [
      {
        model: Job,
        as: 'job',
        attributes: [
          'id',
          'title',
          'company_id',
          'location',
          'remote_type',
          'contract_type',
          'quiz_enabled',
          'quiz_data',
        ],
        include: [{ model: Company, as: 'company' }],
      },
      candidateInclude,
      {
        model: ApplicationNote,
        as: 'notes',
        separate: true,
        order: [['created_at', 'DESC']],
      },
    ],
  });

  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  if (!application.job || application.job.company_id !== companyId) {
    throw ApiError.forbidden('Application does not belong to your company');
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

module.exports = {
  getApplicationForCompany,
  listCompanyApplications,
  getApplicationDetail,
  updateApplicationStatus,
  restoreApplication,
  deleteArchivedApplication,
  addApplicationNote,
  formatApplication,
};
