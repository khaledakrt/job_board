'use strict';

const { Op, fn, col, where } = require('sequelize');
const {
  User,
  Job,
  Company,
  Application,
  CandidateProfile,
  RecruiterProfile,
  UserLoginEvent,
} = require('../models');
const { USER_ROLES, JOB_STATUS } = require('../config/constants');
const ApiError = require('../utils/ApiError');
const { generateUuid } = require('../utils/uuid');
const { hashPassword } = require('../utils/password');
const { parsePagination, buildPaginatedResponse } = require('../utils/pagination');
const { expireDueJobs } = require('../utils/jobExpiration');

function formatUserListItem(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isVerified: Boolean(user.is_verified),
    isBanned: Boolean(user.is_banned),
    banReason: user.ban_reason,
    bannedAt: user.banned_at,
    lastLoginIp: user.last_login_ip,
    createdAt: user.created_at,
    candidateProfile: user.candidateProfile
      ? {
          id: user.candidateProfile.id,
          firstName: user.candidateProfile.first_name,
          lastName: user.candidateProfile.last_name,
        }
      : null,
    recruiterProfile: user.recruiterProfile
      ? {
          id: user.recruiterProfile.id,
          companyName: user.recruiterProfile.company?.name,
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

async function getStats() {
  const [usersTotal, candidates, recruiters, admins, banned, jobsTotal, applicationsTotal, companiesTotal] =
    await Promise.all([
      User.count(),
      User.count({ where: { role: USER_ROLES.CANDIDATE } }),
      User.count({ where: { role: USER_ROLES.RECRUITER } }),
      User.count({ where: { role: USER_ROLES.ADMIN } }),
      User.count({ where: { is_banned: true } }),
      Job.count(),
      Application.count(),
      Company.count(),
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
    const ip = String(query.ip).trim().slice(0, 45);
    const events = await UserLoginEvent.findAll({
      where: { ip_address: ip },
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
        attributes: ['id', 'first_name', 'last_name'],
        required: false,
      },
      {
        model: RecruiterProfile,
        as: 'recruiterProfile',
        attributes: ['id', 'company_id'],
        required: false,
        include: [{ model: Company, as: 'company', attributes: ['name'] }],
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

async function getUserById(userId) {
  const user = await User.findByPk(userId, {
    attributes: {
      exclude: ['password_hash', 'reset_token', 'reset_expires'],
    },
    include: [
      { model: CandidateProfile, as: 'candidateProfile', required: false },
      {
        model: RecruiterProfile,
        as: 'recruiterProfile',
        required: false,
        include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }],
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
      ipAddress: e.ip_address,
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

  const user = await User.create({
    id: generateUuid(),
    email,
    password_hash: passwordHash,
    role: payload.role,
    is_verified: isVerified,
    verification_token: isVerified ? null : generateUuid().replace(/-/g, ''),
    is_banned: false,
    ban_reason: null,
    banned_at: null,
    last_login_ip: null,
    reset_token: null,
    reset_expires: null,
    created_at: new Date(),
  });

  if (payload.role === USER_ROLES.CANDIDATE) {
    await CandidateProfile.create({
      id: generateUuid(),
      user_id: user.id,
      first_name: payload.firstName || 'Prénom',
      last_name: payload.lastName || 'Nom',
      professional_title: payload.professionalTitle || null,
      phone: payload.phone || null,
      skills: [],
      updated_at: new Date(),
    });
  }

  if (payload.role === USER_ROLES.RECRUITER) {
    let companyId = payload.companyId;
    if (!companyId && payload.companyName) {
      const company = await Company.create({
        id: generateUuid(),
        name: payload.companyName.trim(),
        industry: payload.companyIndustry || null,
        website: null,
        description: 'Créée par administrateur',
        created_at: new Date(),
      });
      companyId = company.id;
    }
    if (!companyId) {
      throw ApiError.badRequest('companyId or companyName required for recruiter');
    }
    const company = await Company.findByPk(companyId);
    if (!company) {
      throw ApiError.notFound('Company not found');
    }
    await RecruiterProfile.create({
      id: generateUuid(),
      user_id: user.id,
      company_id: companyId,
      job_title: payload.jobTitle || 'Recruteur',
      company_role: 'owner',
      can_post_job: true,
      can_decide_application: true,
      can_edit_company: true,
      updated_at: new Date(),
    });
  }

  return getUserById(user.id);
}

async function updateUser(userId, payload, actingAdminId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (userId === actingAdminId && payload.role && payload.role !== USER_ROLES.ADMIN) {
    throw ApiError.badRequest('You cannot remove your own admin role');
  }

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
    }
  }

  if (Object.keys(updates).length) {
    await user.update(updates);
  }

  if (payload.role === USER_ROLES.CANDIDATE && payload.firstName !== undefined) {
    const [profile] = await CandidateProfile.findOrCreate({
      where: { user_id: user.id },
      defaults: {
        id: generateUuid(),
        user_id: user.id,
        first_name: payload.firstName || 'Prénom',
        last_name: payload.lastName || 'Nom',
        updated_at: new Date(),
      },
    });
    if (payload.firstName !== undefined || payload.lastName !== undefined) {
      await profile.update({
        first_name: payload.firstName ?? profile.first_name,
        last_name: payload.lastName ?? profile.last_name,
        updated_at: new Date(),
      });
    }
  }

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
  });
  return { message: 'Password updated' };
}

async function banUser(userId, { reason }) {
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
  return getUserById(user.id);
}

async function unbanUser(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  await user.update({
    is_banned: false,
    ban_reason: null,
    banned_at: null,
  });
  return getUserById(user.id);
}

async function deleteUser(userId, actingAdminId) {
  if (userId === actingAdminId) {
    throw ApiError.badRequest('Cannot delete your own account');
  }
  const user = await User.findByPk(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  if (user.role === USER_ROLES.ADMIN) {
    throw ApiError.badRequest('Cannot delete an admin account');
  }
  await user.destroy();
  return { message: 'User deleted' };
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

async function updateJobStatus(jobId, status) {
  const job = await Job.findByPk(jobId);
  if (!job) {
    throw ApiError.notFound('Job not found');
  }
  if (!Object.values(JOB_STATUS).includes(status)) {
    throw ApiError.badRequest('Invalid job status');
  }
  await job.update({ status });
  const refreshed = await Job.findByPk(jobId, {
    include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }],
  });
  return formatJobAdmin(refreshed);
}

async function deleteJob(jobId) {
  const job = await Job.findByPk(jobId);
  if (!job) {
    throw ApiError.notFound('Job not found');
  }
  await job.destroy();
  return { message: 'Job deleted' };
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

  const paginated = buildPaginatedResponse({ rows, count, page, limit });
  return {
    items: paginated.items.map((c) => ({
      id: c.id,
      name: c.name,
      industry: c.industry,
      createdAt: c.created_at,
    })),
    pagination: paginated.pagination,
  };
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
  updateJobStatus,
  deleteJob,
  listCompanies,
};
