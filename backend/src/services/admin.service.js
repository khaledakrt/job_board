'use strict';

const { Op, fn, col, where, literal } = require('sequelize');
const {
  User,
  Job,
  Company,
  Application,
  ApplicationNote,
  CandidateProfile,
  RecruiterProfile,
  UserLoginEvent,
  RefreshSession,
  Subscription,
  AdminAuditLog,
  TrainingCenter,
  PrivateInstitution,
} = require('../models');
const { CATALOG_PUBLISH_STATUS } = require('../config/constants');
const { USER_ROLES, JOB_STATUS, JOB_MANUAL_STATUSES } = require('../config/constants');
const { env } = require('../config');
const ApiError = require('../utils/ApiError');
const { generateUuid } = require('../utils/uuid');
const { hashPassword } = require('../utils/password');
const tokenService = require('./token.service');
const subscriptionService = require('./subscription.service');
const { parsePagination, buildPaginatedResponse } = require('../utils/pagination');
const { formatStoredIpAddress, normalizeIpAddress } = require('../utils/clientIp');
const { expireDueJobs } = require('../utils/jobExpiration');

function buildVerificationExpiry() {
  const expires = new Date();
  expires.setHours(expires.getHours() + env.EMAIL_VERIFICATION_EXPIRES_HOURS);
  return expires;
}

async function logAdminAction({ actorId, action, targetType, targetId = null, metadata = null }) {
  try {
    await AdminAuditLog.create({
      id: generateUuid(),
      actor_id: actorId || null,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata,
      created_at: new Date(),
    });
  } catch (err) {
    // Audit logging must not block moderation actions if a migration is pending.
    console.warn('Admin audit log failed:', err.message);
  }
}

function formatUserListItem(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isVerified: Boolean(user.is_verified),
    isBanned: Boolean(user.is_banned),
    banReason: user.ban_reason,
    bannedAt: user.banned_at,
    lastLoginIp: formatStoredIpAddress(user.last_login_ip),
    createdAt: user.created_at,
    candidateProfile: user.candidateProfile
      ? {
          id: user.candidateProfile.id,
          firstName: user.candidateProfile.first_name,
          lastName: user.candidateProfile.last_name,
          avatarUrl: user.candidateProfile.avatar_url,
        }
      : null,
    recruiterProfile: user.recruiterProfile
      ? {
          id: user.recruiterProfile.id,
          companyName: user.recruiterProfile.company?.name,
          companyLogoUrl: user.recruiterProfile.company?.logo_url,
        }
      : null,
  };
}

function formatUserDetail(user) {
  const base = formatUserListItem(user);
  return {
    ...base,
    verificationToken: user.verification_token ? '***' : null,
    candidateProfile: user.candidateProfile
      ? {
          id: user.candidateProfile.id,
          firstName: user.candidateProfile.first_name,
          lastName: user.candidateProfile.last_name,
          avatarUrl: user.candidateProfile.avatar_url,
          professionalTitle: user.candidateProfile.professional_title,
          phone: user.candidateProfile.phone,
        }
      : null,
    recruiterProfile: user.recruiterProfile
      ? {
          id: user.recruiterProfile.id,
          jobTitle: user.recruiterProfile.job_title,
          companyId: user.recruiterProfile.company_id,
          companyName: user.recruiterProfile.company?.name,
          companyLogoUrl: user.recruiterProfile.company?.logo_url,
        }
      : null,
  };
}

function formatJobAdmin(job) {
  return {
    id: job.id,
    title: job.title,
    status: job.status,
    companyId: job.company_id,
    companyName: job.company?.name,
    location: job.location,
    contractType: job.contract_type,
    viewsCount: job.views_count,
    applicationsCount: job.applications_count,
    createdAt: job.created_at,
    expiresAt: job.expires_at,
  };
}

function formatSubscriptionAdmin(subscription) {
  return subscriptionService.formatSubscription(subscription);
}

function formatApplicationAdmin(application) {
  const candidate = application.candidate;
  const candidateName = candidate
    ? `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim()
    : null;
  const isInterview = application.status === 'interview';
  return {
    id: application.id,
    status: application.status,
    rating: application.rating,
    interviewAt: isInterview ? application.interview_at ?? null : null,
    hasResume: Boolean(application.resume_snapshot_url),
    hasCoverLetter: Boolean(application.cover_letter),
    hasQuizAnswers: Boolean(application.quiz_answers),
    createdAt: application.created_at,
    updatedAt: application.updated_at,
    job: application.job
      ? {
          id: application.job.id,
          title: application.job.title,
          status: application.job.status,
          companyId: application.job.company_id,
          companyName: application.job.company?.name ?? null,
        }
      : null,
    candidate: candidate
      ? {
          id: candidate.id,
          userId: candidate.user_id,
          name: candidateName || null,
          email: candidate.user?.email ?? null,
          professionalTitle: candidate.professional_title ?? null,
        }
      : null,
  };
}

function formatCompanyAdmin(company, counts = {}) {
  return {
    id: company.id,
    name: company.name,
    legalName: company.legal_name,
    legalForm: company.legal_form,
    industry: company.industry,
    city: company.city,
    country: company.country,
    contactEmail: company.contact_email,
    contactPhone: company.contact_phone,
    website: company.website,
    logoUrl: company.logo_url,
    scaleSize: company.scale_size,
    foundedYear: company.founded_year,
    jobsCount: counts.jobsCount ?? 0,
    activeJobsCount: counts.activeJobsCount ?? 0,
    recruitersCount: counts.recruitersCount ?? 0,
    applicationsCount: counts.applicationsCount ?? 0,
    subscription: counts.subscription ?? formatSubscriptionAdmin(company.subscription),
    createdAt: company.created_at,
  };
}

async function getStats() {
  const [
    usersTotal,
    candidates,
    recruiters,
    admins,
    banned,
    jobsTotal,
    applicationsTotal,
    companiesTotal,
    trainingCentersTotal,
    trainingCentersPending,
    privateInstitutionsTotal,
    privateInstitutionsPending,
  ] = await Promise.all([
    User.count(),
    User.count({ where: { role: USER_ROLES.CANDIDATE } }),
    User.count({ where: { role: USER_ROLES.RECRUITER } }),
    User.count({ where: { role: USER_ROLES.ADMIN } }),
    User.count({ where: { is_banned: true } }),
    Job.count(),
    Application.count(),
    Company.count(),
    TrainingCenter.count(),
    TrainingCenter.count({ where: { status: CATALOG_PUBLISH_STATUS.PENDING } }),
    PrivateInstitution.count(),
    PrivateInstitution.count({ where: { status: CATALOG_PUBLISH_STATUS.PENDING } }),
  ]);

  return {
    usersTotal,
    candidates,
    recruiters,
    admins,
    bannedUsers: banned,
    jobsTotal,
    applicationsTotal,
    companiesTotal,
    trainingCentersTotal,
    trainingCentersPending,
    privateInstitutionsTotal,
    privateInstitutionsPending,
  };
}

async function listUsers(query = {}) {
  const userWhere = {};

  if (query.role) {
    userWhere.role = query.role;
  }
  if (query.banned === 'true') {
    userWhere.is_banned = true;
  } else if (query.banned === 'false') {
    userWhere.is_banned = false;
  }
  if (query.ip) {
    const ip = normalizeIpAddress(String(query.ip).trim()) || String(query.ip).trim().slice(0, 45);
    const ipv6Mapped = ip.includes('.') ? `::ffff:${ip}` : null;
    const ipOr = [{ ip_address: ip }];
    if (ipv6Mapped) ipOr.push({ ip_address: ipv6Mapped });
    if (ip === '127.0.0.1') ipOr.push({ ip_address: '::1' });
    const events = await UserLoginEvent.findAll({
      where: { [Op.or]: ipOr },
      attributes: ['user_id'],
      raw: true,
    });
    const userIds = [...new Set(events.map((e) => e.user_id))];
    userWhere.id = userIds.length ? { [Op.in]: userIds } : { [Op.in]: ['__none__'] };
  }
  if (query.search) {
    const term = `%${query.search.trim()}%`;
    userWhere[Op.or] = [{ email: { [Op.like]: term } }];
  }

  const { page, limit, offset } = parsePagination(query);

  const { rows, count } = await User.findAndCountAll({
    where: userWhere,
    attributes: {
      exclude: ['password_hash', 'verification_token', 'reset_token', 'reset_expires'],
    },
    include: [
      {
        model: CandidateProfile,
        as: 'candidateProfile',
        attributes: ['id', 'first_name', 'last_name', 'avatar_url'],
        required: false,
      },
      {
        model: RecruiterProfile,
        as: 'recruiterProfile',
        attributes: ['id', 'company_id'],
        required: false,
        include: [{ model: Company, as: 'company', attributes: ['name', 'logo_url'] }],
      },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  const paginated = buildPaginatedResponse({ rows, count, page, limit });
  return {
    items: paginated.items.map(formatUserListItem),
    pagination: paginated.pagination,
  };
}

const CANDIDATE_PROFILE_ADMIN_ATTRS = [
  'id',
  'user_id',
  'first_name',
  'last_name',
  'avatar_url',
  'phone',
  'professional_title',
];

async function getUserById(userId) {
  const user = await User.findByPk(userId, {
    attributes: {
      exclude: ['password_hash', 'reset_token', 'reset_expires'],
    },
    include: [
      {
        model: CandidateProfile,
        as: 'candidateProfile',
        attributes: CANDIDATE_PROFILE_ADMIN_ATTRS,
        required: false,
      },
      {
        model: RecruiterProfile,
        as: 'recruiterProfile',
        attributes: ['id', 'company_id', 'job_title'],
        required: false,
        include: [{ model: Company, as: 'company', attributes: ['id', 'name', 'logo_url'] }],
      },
    ],
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  return formatUserDetail(user);
}

async function listUserLoginEvents(userId, query = {}) {
  const user = await User.findByPk(userId, { attributes: ['id'] });
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const { page, limit, offset } = parsePagination(query);
  const { rows, count } = await UserLoginEvent.findAndCountAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  const paginated = buildPaginatedResponse({ rows, count, page, limit });
  return {
    items: paginated.items.map((e) => ({
      id: e.id,
      ipAddress: formatStoredIpAddress(e.ip_address),
      userAgent: e.user_agent,
      createdAt: e.created_at,
    })),
    pagination: paginated.pagination,
  };
}

async function createUser(payload) {
  const email = payload.email.trim().toLowerCase();
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw ApiError.conflict('Email is already registered');
  }

  const passwordHash = await hashPassword(payload.password);
  const isVerified = payload.isVerified !== false;
  const verificationToken = isVerified ? null : tokenService.generateSecureToken();

  const userId = await User.sequelize.transaction(async (transaction) => {
    const user = await User.create(
      {
        id: generateUuid(),
        email,
        password_hash: passwordHash,
        role: payload.role,
        is_verified: isVerified,
        verification_token: verificationToken ? tokenService.hashSecureToken(verificationToken) : null,
        verification_expires: verificationToken ? buildVerificationExpiry() : null,
        is_banned: false,
        ban_reason: null,
        banned_at: null,
        last_login_ip: null,
        reset_token: null,
        reset_expires: null,
        created_at: new Date(),
      },
      { transaction }
    );

    if (payload.role === USER_ROLES.CANDIDATE) {
      await CandidateProfile.create(
        {
          id: generateUuid(),
          user_id: user.id,
          first_name: payload.firstName || 'Prénom',
          last_name: payload.lastName || 'Nom',
          professional_title: payload.professionalTitle || null,
          phone: payload.phone || null,
          skills: [],
          updated_at: new Date(),
        },
        { transaction }
      );
    }

    if (payload.role === USER_ROLES.RECRUITER) {
      let companyId = payload.companyId;
      if (!companyId && payload.companyName) {
        const company = await Company.create(
          {
            id: generateUuid(),
            name: payload.companyName.trim(),
            industry: payload.companyIndustry || null,
            website: null,
            description: 'Créée par administrateur',
            created_at: new Date(),
          },
          { transaction }
        );
        companyId = company.id;
      }
      if (!companyId) {
        throw ApiError.badRequest('companyId or companyName required for recruiter');
      }
      const company = await Company.findByPk(companyId, { transaction });
      if (!company) {
        throw ApiError.notFound('Company not found');
      }
      await RecruiterProfile.create(
        {
          id: generateUuid(),
          user_id: user.id,
          company_id: companyId,
          job_title: payload.jobTitle || 'Recruteur',
          company_role: 'owner',
          can_post_job: true,
          can_decide_application: true,
          can_edit_company: true,
          updated_at: new Date(),
        },
        { transaction }
      );
    }

    if (payload.role === USER_ROLES.TRAINING_PROVIDER) {
      await TrainingCenter.create(
        {
          id: generateUuid(),
          user_id: user.id,
          name: defaultProviderName(user, payload),
          email: user.email,
          status: CATALOG_PUBLISH_STATUS.PENDING,
          created_at: new Date(),
          updated_at: new Date(),
        },
        { transaction }
      );
    }

    if (payload.role === USER_ROLES.INSTITUTION_PROVIDER) {
      await PrivateInstitution.create(
        {
          id: generateUuid(),
          user_id: user.id,
          name: defaultProviderName(user, payload),
          institution_type: payload.institutionType || 'academy',
          email: user.email,
          status: CATALOG_PUBLISH_STATUS.PENDING,
          created_at: new Date(),
          updated_at: new Date(),
        },
        { transaction }
      );
    }

    return user.id;
  });

  return getUserById(userId);
}

async function resolveCompanyForRecruiterPayload(payload, transaction) {
  let companyId = payload.companyId;
  if (!companyId && payload.companyName) {
    const company = await Company.create(
      {
        id: generateUuid(),
        name: payload.companyName.trim(),
        industry: payload.companyIndustry || null,
        website: null,
        description: 'Créée par administrateur',
        created_at: new Date(),
      },
      { transaction }
    );
    companyId = company.id;
  }
  if (!companyId) {
    throw ApiError.badRequest('companyId or companyName required for recruiter role');
  }
  const company = await Company.findByPk(companyId, { transaction });
  if (!company) {
    throw ApiError.notFound('Company not found');
  }
  return companyId;
}

function defaultProviderName(user, payload) {
  return payload.providerName?.trim() || user.email.split('@')[0] || 'Nouveau compte';
}

async function ensureProfileForRole(user, role, payload, transaction) {
  if (role === USER_ROLES.CANDIDATE) {
    const [profile] = await CandidateProfile.findOrCreate({
      where: { user_id: user.id },
      defaults: {
        id: generateUuid(),
        user_id: user.id,
        first_name: payload.firstName || 'Prénom',
        last_name: payload.lastName || 'Nom',
        professional_title: payload.professionalTitle || null,
        phone: payload.phone || null,
        skills: [],
        updated_at: new Date(),
      },
      transaction,
    });
    await profile.update(
      {
        first_name: payload.firstName ?? profile.first_name ?? 'Prénom',
        last_name: payload.lastName ?? profile.last_name ?? 'Nom',
        professional_title: payload.professionalTitle ?? profile.professional_title,
        phone: payload.phone ?? profile.phone,
        updated_at: new Date(),
      },
      { transaction }
    );
    return;
  }

  if (role === USER_ROLES.RECRUITER) {
    let profile = await RecruiterProfile.findOne({ where: { user_id: user.id }, transaction });
    if (!profile) {
      const companyId = await resolveCompanyForRecruiterPayload(payload, transaction);
      profile = await RecruiterProfile.create(
        {
          id: generateUuid(),
          user_id: user.id,
          company_id: companyId,
          job_title: payload.jobTitle || 'Recruteur',
          company_role: 'owner',
          can_post_job: true,
          can_decide_application: true,
          can_edit_company: true,
          updated_at: new Date(),
        },
        { transaction }
      );
      return;
    }
    await profile.update(
      {
        job_title: payload.jobTitle !== undefined ? payload.jobTitle || 'Recruteur' : profile.job_title,
        updated_at: new Date(),
      },
      { transaction }
    );
    return;
  }

  if (role === USER_ROLES.TRAINING_PROVIDER) {
    await TrainingCenter.findOrCreate({
      where: { user_id: user.id },
      defaults: {
        id: generateUuid(),
        user_id: user.id,
        name: defaultProviderName(user, payload),
        email: user.email,
        status: CATALOG_PUBLISH_STATUS.PENDING,
        created_at: new Date(),
        updated_at: new Date(),
      },
      transaction,
    });
    return;
  }

  if (role === USER_ROLES.INSTITUTION_PROVIDER) {
    await PrivateInstitution.findOrCreate({
      where: { user_id: user.id },
      defaults: {
        id: generateUuid(),
        user_id: user.id,
        name: defaultProviderName(user, payload),
        institution_type: payload.institutionType || 'academy',
        email: user.email,
        status: CATALOG_PUBLISH_STATUS.PENDING,
        created_at: new Date(),
        updated_at: new Date(),
      },
      transaction,
    });
  }
}

async function updateUser(userId, payload, actingAdminId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (userId === actingAdminId && payload.role && payload.role !== USER_ROLES.ADMIN) {
    throw ApiError.badRequest('You cannot remove your own admin role');
  }

  const previousRole = user.role;
  const nextRole = payload.role || user.role;

  await User.sequelize.transaction(async (transaction) => {
    const updates = {};

    if (payload.email !== undefined) {
      const normalized = payload.email.trim().toLowerCase();
      if (normalized !== user.email.trim().toLowerCase()) {
        const taken = await User.findOne({
          where: {
            [Op.and]: [
              where(fn('LOWER', col('email')), normalized),
              { id: { [Op.ne]: user.id } },
            ],
          },
          transaction,
        });
        if (taken) {
          throw ApiError.conflict('Email already in use');
        }
        updates.email = normalized;
      }
    }

    if (payload.role !== undefined) {
      updates.role = payload.role;
    }

    if (payload.isVerified !== undefined) {
      updates.is_verified = payload.isVerified;
      if (payload.isVerified) {
        updates.verification_token = null;
        updates.verification_expires = null;
      }
    }

    if (Object.keys(updates).length) {
      await user.update(updates, { transaction });
    }

    await ensureProfileForRole(user, nextRole, payload, transaction);

    if (previousRole === USER_ROLES.RECRUITER && nextRole !== USER_ROLES.RECRUITER) {
      await RecruiterProfile.update(
        {
          can_post_job: false,
          can_decide_application: false,
          can_edit_company: false,
          updated_at: new Date(),
        },
        { where: { user_id: user.id }, transaction }
      );
    }
  });

  return getUserById(user.id);
}

async function setUserPassword(userId, newPassword) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  const passwordHash = await hashPassword(newPassword);
  await user.update({
    password_hash: passwordHash,
    reset_token: null,
    reset_expires: null,
    password_changed_at: new Date(),
    session_version: Number(user.session_version || 0) + 1,
  });
  await RefreshSession.update(
    { revoked_at: new Date() },
    { where: { user_id: user.id, revoked_at: null } }
  );
  return { message: 'Password updated' };
}

async function revokeUserSessions(user) {
  await user.update({
    reset_token: null,
    reset_expires: null,
    password_changed_at: new Date(),
    session_version: Number(user.session_version || 0) + 1,
  });
  await RefreshSession.update(
    { revoked_at: new Date() },
    { where: { user_id: user.id, revoked_at: null } }
  );
}

async function banUser(userId, { reason }, actingAdminId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  if (user.role === USER_ROLES.ADMIN) {
    throw ApiError.badRequest('Cannot ban an admin account');
  }
  await user.update({
    is_banned: true,
    ban_reason: reason ? String(reason).slice(0, 500) : 'Banned by administrator',
    banned_at: new Date(),
  });
  await revokeUserSessions(user);
  await logAdminAction({
    actorId: actingAdminId,
    action: 'user.ban',
    targetType: 'user',
    targetId: user.id,
    metadata: { reason: reason ? String(reason).slice(0, 500) : null },
  });
  return getUserById(user.id);
}

async function unbanUser(userId, actingAdminId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  await user.update({
    is_banned: false,
    ban_reason: null,
    banned_at: null,
  });
  await logAdminAction({
    actorId: actingAdminId,
    action: 'user.unban',
    targetType: 'user',
    targetId: user.id,
  });
  return getUserById(user.id);
}

async function deleteUser(userId, actingAdminId) {
  if (userId === actingAdminId) {
    throw ApiError.badRequest('Cannot disable your own account');
  }
  const user = await User.findByPk(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  if (user.role === USER_ROLES.ADMIN) {
    throw ApiError.badRequest('Cannot disable an admin account');
  }
  await user.update({
    is_banned: true,
    ban_reason: 'Compte désactivé par un administrateur',
    banned_at: new Date(),
  });
  await revokeUserSessions(user);
  await logAdminAction({
    actorId: actingAdminId,
    action: 'user.disable',
    targetType: 'user',
    targetId: user.id,
    metadata: { role: user.role },
  });
  return { message: 'User disabled' };
}

async function listJobs(query = {}) {
  await expireDueJobs();

  const jobWhere = {};
  if (query.status) {
    jobWhere.status = query.status;
  }
  if (query.search) {
    jobWhere.title = { [Op.like]: `%${query.search.trim()}%` };
  }

  const { page, limit, offset } = parsePagination(query);

  const { rows, count } = await Job.findAndCountAll({
    where: jobWhere,
    include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  const paginated = buildPaginatedResponse({ rows, count, page, limit });
  return {
    items: paginated.items.map(formatJobAdmin),
    pagination: paginated.pagination,
  };
}

async function getJobById(jobId) {
  const job = await Job.findByPk(jobId, {
    include: [
      { model: Company, as: 'company', attributes: ['id', 'name', 'industry', 'website'] },
      {
        model: RecruiterProfile,
        as: 'recruiter',
        attributes: ['id', 'user_id', 'job_title'],
        include: [{ model: User, as: 'user', attributes: ['id', 'email'] }],
      },
      {
        model: Application,
        as: 'applications',
        separate: true,
        limit: 10,
        order: [['created_at', 'DESC']],
        attributes: ['id', 'status', 'rating', 'created_at'],
        include: [
          {
            model: CandidateProfile,
            as: 'candidate',
            attributes: ['id', 'user_id', 'first_name', 'last_name', 'professional_title'],
            include: [{ model: User, as: 'user', attributes: ['id', 'email'] }],
          },
        ],
      },
    ],
  });
  if (!job) {
    throw ApiError.notFound('Job not found');
  }

  return {
    ...formatJobAdmin(job),
    description: job.description,
    requirements: job.requirements,
    tags: job.tags ?? [],
    languages: job.languages ?? [],
    benefits: job.benefits ?? [],
    remoteType: job.remote_type,
    salaryLabel: job.salary_label,
    experienceYears: job.experience_years,
    quizEnabled: Boolean(job.quiz_enabled),
    company: job.company
      ? {
          id: job.company.id,
          name: job.company.name,
          industry: job.company.industry,
          website: job.company.website,
        }
      : null,
    recruiter: job.recruiter
      ? {
          id: job.recruiter.id,
          userId: job.recruiter.user_id,
          email: job.recruiter.user?.email ?? null,
          jobTitle: job.recruiter.job_title,
        }
      : null,
    recentApplications: (job.applications ?? []).map(formatApplicationAdmin),
  };
}

async function updateJobStatus(jobId, status, actingAdminId) {
  await expireDueJobs();
  const job = await Job.findByPk(jobId);
  if (!job) {
    throw ApiError.notFound('Job not found');
  }
  if (!JOB_MANUAL_STATUSES.includes(status)) {
    throw ApiError.badRequest('Invalid job status');
  }
  if (job.status === JOB_STATUS.EXPIRED) {
    throw ApiError.badRequest('Expired jobs cannot be manually republished from admin status controls');
  }
  if (status === JOB_STATUS.ACTIVE) {
    const expiresAt = job.expires_at ? new Date(job.expires_at) : null;
    if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      throw ApiError.badRequest('Active jobs require a future expiration date');
    }
    const canPublish = await subscriptionService.verifyActiveSubscription(job.company_id);
    if (!canPublish) {
      throw ApiError.forbidden('An active company subscription is required to publish this job');
    }
  }
  const previousStatus = job.status;
  const nextFields = { status };
  if (status === JOB_STATUS.ACTIVE || status === JOB_STATUS.DRAFT) {
    nextFields.archived_at = null;
    nextFields.archived_by = null;
    nextFields.deleted_by_recruiter_at = null;
    nextFields.deleted_by_recruiter_by = null;
  }
  await job.update(nextFields);
  await logAdminAction({
    actorId: actingAdminId,
    action: 'job.status.update',
    targetType: 'job',
    targetId: job.id,
    metadata: { previousStatus, status },
  });
  const refreshed = await Job.findByPk(jobId, {
    include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }],
  });
  return formatJobAdmin(refreshed);
}

async function deleteJob(jobId, actingAdminId) {
  const job = await Job.findByPk(jobId);
  if (!job) {
    throw ApiError.notFound('Job not found');
  }
  const previousStatus = job.status;
  await job.update({ status: JOB_STATUS.HIDDEN });
  await logAdminAction({
    actorId: actingAdminId,
    action: 'job.hide',
    targetType: 'job',
    targetId: job.id,
    metadata: { previousStatus },
  });
  return { message: 'Job hidden' };
}

async function listApplications(query = {}) {
  const whereClause = {};
  if (query.status) {
    whereClause.status = query.status;
  }
  if (query.search) {
    const term = `%${query.search.trim()}%`;
    whereClause[Op.or] = [
      { '$job.title$': { [Op.like]: term } },
      { '$job.company.name$': { [Op.like]: term } },
      { '$candidate.first_name$': { [Op.like]: term } },
      { '$candidate.last_name$': { [Op.like]: term } },
      { '$candidate.user.email$': { [Op.like]: term } },
    ];
  }

  const { page, limit, offset } = parsePagination(query);
  const { rows, count } = await Application.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Job,
        as: 'job',
        attributes: ['id', 'title', 'status', 'company_id'],
        include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }],
      },
      {
        model: CandidateProfile,
        as: 'candidate',
        attributes: ['id', 'user_id', 'first_name', 'last_name', 'professional_title'],
        include: [{ model: User, as: 'user', attributes: ['id', 'email'] }],
      },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
    subQuery: false,
    distinct: true,
  });

  const paginated = buildPaginatedResponse({ rows, count, page, limit });
  return {
    items: paginated.items.map(formatApplicationAdmin),
    pagination: paginated.pagination,
  };
}

async function getApplicationById(applicationId) {
  const application = await Application.findByPk(applicationId, {
    include: [
      {
        model: Job,
        as: 'job',
        include: [
          { model: Company, as: 'company', attributes: ['id', 'name', 'industry', 'website'] },
          {
            model: RecruiterProfile,
            as: 'recruiter',
            attributes: ['id', 'user_id', 'job_title'],
            include: [{ model: User, as: 'user', attributes: ['id', 'email'] }],
          },
        ],
      },
      {
        model: CandidateProfile,
        as: 'candidate',
        include: [{ model: User, as: 'user', attributes: ['id', 'email', 'is_verified', 'is_banned'] }],
      },
      {
        model: ApplicationNote,
        as: 'notes',
        separate: true,
        order: [['created_at', 'DESC']],
        include: [{ model: User, as: 'author', attributes: ['id', 'email'] }],
      },
    ],
  });
  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  return {
    ...formatApplicationAdmin(application),
    coverLetter: application.cover_letter,
    resumeSnapshotUrl: application.resume_snapshot_url,
    quizAnswers: application.quiz_answers ?? null,
    interviewAt: application.status === 'interview' ? application.interview_at : null,
    job: application.job
      ? {
          id: application.job.id,
          title: application.job.title,
          status: application.job.status,
          companyId: application.job.company_id,
          companyName: application.job.company?.name ?? null,
          location: application.job.location,
          contractType: application.job.contract_type,
          remoteType: application.job.remote_type,
          expiresAt: application.job.expires_at,
          recruiterEmail: application.job.recruiter?.user?.email ?? null,
        }
      : null,
    candidate: application.candidate
      ? {
          id: application.candidate.id,
          userId: application.candidate.user_id,
          name: `${application.candidate.first_name || ''} ${application.candidate.last_name || ''}`.trim() || null,
          email: application.candidate.user?.email ?? null,
          professionalTitle: application.candidate.professional_title,
          phone: application.candidate.phone,
          isVerified: Boolean(application.candidate.user?.is_verified),
          isBanned: Boolean(application.candidate.user?.is_banned),
        }
      : null,
    notes: (application.notes ?? []).map((note) => ({
      id: note.id,
      text: note.note_text,
      authorEmail: note.author?.email ?? null,
      createdAt: note.created_at,
    })),
  };
}

async function listCompanies(query = {}) {
  const companyWhere = {};
  if (query.search) {
    companyWhere.name = { [Op.like]: `%${query.search.trim()}%` };
  }

  const { page, limit, offset } = parsePagination(query);

  const { rows, count } = await Company.findAndCountAll({
    where: companyWhere,
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  const companyIds = rows.map((c) => c.id);
  const countsByCompany = Object.fromEntries(
    companyIds.map((id) => [id, { jobsCount: 0, activeJobsCount: 0, recruitersCount: 0, applicationsCount: 0 }])
  );

  if (companyIds.length) {
    const [jobCounts, recruiterCounts, applicationCounts, subscriptions] = await Promise.all([
      Job.findAll({
        where: { company_id: { [Op.in]: companyIds } },
        attributes: [
          'company_id',
          [fn('COUNT', col('Job.id')), 'jobsCount'],
          [
            literal("SUM(CASE WHEN `Job`.`status` = 'active' THEN 1 ELSE 0 END)"),
            'activeJobsCount',
          ],
        ],
        group: ['company_id'],
        raw: true,
      }),
      RecruiterProfile.findAll({
        where: { company_id: { [Op.in]: companyIds } },
        attributes: ['company_id', [fn('COUNT', col('id')), 'recruitersCount']],
        group: ['company_id'],
        raw: true,
      }),
      Application.findAll({
        include: [
          {
            model: Job,
            as: 'job',
            where: { company_id: { [Op.in]: companyIds } },
            attributes: [],
          },
        ],
        attributes: [[col('job.company_id'), 'company_id'], [fn('COUNT', col('Application.id')), 'applicationsCount']],
        group: ['job.company_id'],
        raw: true,
      }),
      Subscription.findAll({
        where: { company_id: { [Op.in]: companyIds } },
      }),
    ]);

    for (const row of jobCounts) {
      countsByCompany[row.company_id].jobsCount = Number(row.jobsCount || 0);
      countsByCompany[row.company_id].activeJobsCount = Number(row.activeJobsCount || 0);
    }
    for (const row of recruiterCounts) {
      countsByCompany[row.company_id].recruitersCount = Number(row.recruitersCount || 0);
    }
    for (const row of applicationCounts) {
      countsByCompany[row.company_id].applicationsCount = Number(row.applicationsCount || 0);
    }
    for (const subscription of subscriptions) {
      countsByCompany[subscription.company_id].subscription = formatSubscriptionAdmin(subscription);
    }
  }

  const paginated = buildPaginatedResponse({ rows, count, page, limit });
  return {
    items: paginated.items.map((c) => formatCompanyAdmin(c, countsByCompany[c.id])),
    pagination: paginated.pagination,
  };
}

async function getCompanyById(companyId) {
  const company = await Company.findByPk(companyId, {
    include: [
      { model: Subscription, as: 'subscription' },
      {
        model: RecruiterProfile,
        as: 'recruiters',
        separate: true,
        limit: 20,
        order: [['updated_at', 'DESC']],
        include: [{ model: User, as: 'user', attributes: ['id', 'email', 'is_verified', 'is_banned'] }],
      },
      {
        model: Job,
        as: 'jobs',
        separate: true,
        limit: 10,
        order: [['created_at', 'DESC']],
      },
    ],
  });
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  const [jobsCount, activeJobsCount, recruitersCount, applicationsCount] = await Promise.all([
    Job.count({ where: { company_id: company.id } }),
    Job.count({ where: { company_id: company.id, status: JOB_STATUS.ACTIVE } }),
    RecruiterProfile.count({ where: { company_id: company.id } }),
    Application.count({
      include: [{ model: Job, as: 'job', where: { company_id: company.id }, attributes: [] }],
    }),
  ]);

  return {
    ...formatCompanyAdmin(company, { jobsCount, activeJobsCount, recruitersCount, applicationsCount }),
    subscription: formatSubscriptionAdmin(company.subscription),
    legalName: company.legal_name,
    legalForm: company.legal_form,
    siret: company.siret,
    vatNumber: company.vat_number,
    streetAddress: company.street_address,
    postalCode: company.postal_code,
    contactEmailPublic: Boolean(company.contact_email_public),
    contactPhonePublic: Boolean(company.contact_phone_public),
    linkedinUrl: company.linkedin_url,
    description: company.description,
    recruiters: (company.recruiters ?? []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      email: r.user?.email ?? null,
      jobTitle: r.job_title,
      companyRole: r.company_role,
      canPostJob: Boolean(r.can_post_job),
      canDecideApplication: Boolean(r.can_decide_application),
      canEditCompany: Boolean(r.can_edit_company),
      isVerified: Boolean(r.user?.is_verified),
      isBanned: Boolean(r.user?.is_banned),
    })),
    recentJobs: (company.jobs ?? []).map(formatJobAdmin),
  };
}

async function getSubscriptionPolicy() {
  const mode = await subscriptionService.getRecruiterSubscriptionMode();
  return { mode };
}

async function updateSubscriptionPolicy(mode, actingAdminId) {
  const previous = await subscriptionService.getRecruiterSubscriptionMode();
  const result = await subscriptionService.setRecruiterSubscriptionMode(mode);
  const canceledManualAccessCount =
    mode === subscriptionService.SUBSCRIPTION_MODES.PAID_REQUIRED
      ? await subscriptionService.cancelManualFreeSubscriptions()
      : 0;
  await logAdminAction({
    actorId: actingAdminId,
    action: 'subscription.policy.update',
    targetType: 'platform_setting',
    targetId: 'recruiter_subscription_mode',
    metadata: { previous, mode, canceledManualAccessCount },
  });
  return { ...result, canceledManualAccessCount };
}

async function updateCompanySubscription(companyId, payload, actingAdminId) {
  const company = await Company.findByPk(companyId, {
    include: [{ model: Subscription, as: 'subscription' }],
  });
  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  const previous = formatSubscriptionAdmin(company.subscription);
  const subscription =
    payload.action === 'activate_manual'
      ? await subscriptionService.grantManualSubscription(companyId, {
          planType: payload.planType,
          months: payload.months,
        })
      : await subscriptionService.cancelCompanySubscription(companyId);

  await logAdminAction({
    actorId: actingAdminId,
    action:
      payload.action === 'activate_manual'
        ? 'company.subscription.activate_manual'
        : 'company.subscription.cancel',
    targetType: 'company',
    targetId: companyId,
    metadata: { previous, subscription },
  });

  return subscription;
}

module.exports = {
  getStats,
  listUsers,
  getUserById,
  listUserLoginEvents,
  createUser,
  updateUser,
  setUserPassword,
  banUser,
  unbanUser,
  deleteUser,
  listJobs,
  getJobById,
  updateJobStatus,
  deleteJob,
  listApplications,
  getApplicationById,
  listCompanies,
  getCompanyById,
  getSubscriptionPolicy,
  updateSubscriptionPolicy,
  updateCompanySubscription,
};
