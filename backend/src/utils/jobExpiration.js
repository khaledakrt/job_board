'use strict';

const { Op } = require('sequelize');
const { Job } = require('../models');
const { JOB_STATUS } = require('../config/constants');

const DEFAULT_JOB_EXPIRATION_DAYS = 60;

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

async function expireDueJobs(scope = {}) {
  await Job.update(
    { status: JOB_STATUS.EXPIRED },
    {
      where: {
        ...scope,
        status: { [Op.in]: EXPIRABLE_STATUSES },
        expires_at: { [Op.lte]: new Date() },
      },
    }
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
