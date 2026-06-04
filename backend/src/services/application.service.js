'use strict';

const { Application, Job, Company, CandidateProfile, ApplicationNote, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { generateUuid } = require('../utils/uuid');
const notificationService = require('./notification.service');
const { buildQuizReview } = require('../utils/jobQuiz');
const { parsePagination, buildPaginatedResponse } = require('../utils/pagination');

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
    resumeUrl: candidate.resume_url,
    minSalary: candidate.min_salary,
  };
}

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
    'resume_url',
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
  interviewAt,
  recruiterUser,
}) {
  const application = await getApplicationForCompany(applicationId, companyId);
  const previousStatus = application.status;

  const updates = {
    status,
    rating: rating ?? application.rating,
    updated_at: new Date(),
  };

  if (interviewAt !== undefined) {
    updates.interview_at = interviewAt ? new Date(interviewAt) : null;
  } else if (status === 'interview' && !application.interview_at) {
    updates.interview_at = new Date();
  }

  await application.update(updates);

  await application.reload({
    include: [
      { model: Job, as: 'job', include: [{ model: Company, as: 'company' }] },
      candidateInclude,
    ],
  });

  const shouldNotify =
    previousStatus !== status || (evaluationText && evaluationText.trim().length > 0);

  let alertResult = null;

  if (shouldNotify) {
    alertResult = await notificationService.notifyApplicationStatusChange({
      application,
      previousStatus,
      newStatus: status,
      evaluationText: evaluationText || null,
      recruiterUser,
    });
  }

  return {
    application: formatApplication(application),
    alert: alertResult,
  };
}

async function addApplicationNote({
  applicationId,
  companyId,
  authorId,
  noteText,
  recruiterUser,
}) {
  const application = await getApplicationForCompany(applicationId, companyId);

  const note = await ApplicationNote.create({
    id: generateUuid(),
    application_id: applicationId,
    author_id: authorId,
    note_text: noteText,
    created_at: new Date(),
  });

  const alertResult = await notificationService.notifyApplicationNote({
    application,
    noteText,
    recruiterUser,
  });

  return {
    note: {
      id: note.id,
      applicationId: note.application_id,
      authorId: note.author_id,
      noteText: note.note_text,
      createdAt: note.created_at,
    },
    alert: alertResult,
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
  addApplicationNote,
  formatApplication,
};
