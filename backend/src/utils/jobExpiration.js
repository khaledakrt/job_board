'use strict';

const { Op } = require('sequelize');
const { Job, RecruiterProfile, User, Company } = require('../models');
const { JOB_STATUS } = require('../config/constants');
const emailService = require('../services/email.service');
const logger = require('./logger');

const DEFAULT_JOB_EXPIRATION_DAYS = 60;
const EXPIRATION_SWEEP_THROTTLE_MS = 60_000;
const lastExpirationSweepByScope = new Map();

const EXPIRABLE_STATUSES = [
  JOB_STATUS.DRAFT,
  JOB_STATUS.ACTIVE,
  JOB_STATUS.HIDDEN,
];

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function defaultExpiresAt(fromDate = new Date()) {
  return addDays(fromDate, DEFAULT_JOB_EXPIRATION_DAYS);
}

function parseExpiresAt(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  date.setHours(23, 59, 59, 999);
  return date;
}

function isExpirationDue(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

function scopeKey(scope) {
  return JSON.stringify(
    Object.keys(scope)
      .sort()
      .reduce((acc, key) => {
        acc[key] = scope[key];
        return acc;
      }, {})
  );
}

async function expireDueJobs(scope = {}, { force = false } = {}) {
  const key = scopeKey(scope);
  const now = Date.now();
  const lastRun = lastExpirationSweepByScope.get(key) || 0;
  if (!force && now - lastRun < EXPIRATION_SWEEP_THROTTLE_MS) {
    return;
  }
  lastExpirationSweepByScope.set(key, now);

  const dueWhere = {
    ...scope,
    status: { [Op.in]: EXPIRABLE_STATUSES },
    expires_at: { [Op.lte]: new Date() },
  };

  const dueJobs = await Job.findAll({
    where: dueWhere,
    include: [
      { model: Company, as: 'company', attributes: ['id', 'name'] },
      {
        model: RecruiterProfile,
        as: 'recruiter',
        attributes: ['id', 'user_id'],
        include: [{ model: User, as: 'user', attributes: ['id', 'email'] }],
      },
    ],
  });

  if (!dueJobs.length) return;

  const archivedAt = new Date();
  await Job.update(
    {
      status: JOB_STATUS.EXPIRED,
      archived_at: archivedAt,
      archived_by: null,
      deleted_by_recruiter_at: null,
      deleted_by_recruiter_by: null,
    },
    { where: { id: { [Op.in]: dueJobs.map((job) => job.id) } } }
  );

  await Promise.all(
    dueJobs.map(async (job) => {
      if (job.status !== JOB_STATUS.ACTIVE) return;
      const email = job.recruiter?.user?.email;
      if (!email) return;
      try {
        await emailService.sendRecruiterJobExpiredEmail({
          to: email,
          jobTitle: job.title,
          companyName: job.company?.name || null,
          expiredAt: job.expires_at,
        });
      } catch (error) {
        logger.warn(`[JobExpiration] Failed to notify recruiter for job ${job.id}: ${error.message}`);
      }
    })
  );
}

module.exports = {
  DEFAULT_JOB_EXPIRATION_DAYS,
  EXPIRABLE_STATUSES,
  addDays,
  defaultExpiresAt,
  parseExpiresAt,
  isExpirationDue,
  expireDueJobs,
};
