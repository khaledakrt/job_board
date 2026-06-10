'use strict';

const { Op, QueryTypes } = require('sequelize');
const {
  RecruiterNotification,
  RecruiterNotificationRead,
  RecruiterProfile,
  User,
} = require('../models');
const sequelize = require('../database/sequelize');
const { env } = require('../config');
const { COMPANY_ROLES } = require('../config/constants');
const { generateUuid } = require('../utils/uuid');
const emailService = require('./email.service');
const logger = require('../utils/logger');

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

function formatCandidateDisplayName(candidate) {
  const name = [candidate.first_name, candidate.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  return name || 'Un candidat';
}

function formatNotification(row, readIds) {
  const readSet = readIds instanceof Set ? readIds : new Set(readIds);
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    messageText: row.message_text,
    applicationId: row.application_id,
    jobId: row.job_id,
    candidateId: row.candidate_id,
    candidateName: row.candidate_name,
    candidateAvatarUrl: row.candidate_avatar_url,
    jobTitle: row.job_title,
    isRead: readSet.has(row.id),
    createdAt: row.created_at,
  };
}

async function notifyNewApplication({ application, job, candidate }) {
  const candidateName = formatCandidateDisplayName(candidate);
  const jobTitle = job.title;
  const title = 'Nouvelle candidature';
  const messageText = `${candidateName} a postulé à votre offre « ${jobTitle} »`;

  const notification = await RecruiterNotification.create({
    id: generateUuid(),
    company_id: job.company_id,
    type: 'application_received',
    title,
    message_text: messageText,
    application_id: application.id,
    job_id: job.id,
    candidate_id: candidate.id,
    candidate_name: candidateName,
    candidate_avatar_url: candidate.avatar_url || null,
    job_title: jobTitle,
    created_at: new Date(),
  });

  const dashboardUrl = `${env.CLIENT_URL}/recruiter/ats?jobId=${job.id}&applicationId=${application.id}`;
  const recruiters = await RecruiterProfile.findAll({
    where: {
      company_id: job.company_id,
      [Op.or]: [{ company_role: COMPANY_ROLES.OWNER }, { can_decide_application: true }],
    },
    include: [{ model: User, as: 'user', attributes: ['email'] }],
  });

  const emailResults = await Promise.allSettled(
    recruiters
      .map((r) => r.user?.email)
      .filter(Boolean)
      .map((email) =>
        emailService.sendRecruiterNewApplicationEmail({
          to: email,
          candidateName,
          jobTitle,
          dashboardUrl,
        })
      )
  );
  const failedEmails = emailResults.filter((result) => result.status === 'rejected');
  if (failedEmails.length) {
    logger.warn(`[RecruiterNotification] ${failedEmails.length} recruiter email(s) failed`);
  }

  return formatNotification(notification, []);
}

function normalizeLimit(limit) {
  const n = Number(limit);
  if (!Number.isInteger(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

async function listForRecruiter({ companyId, recruiterId, limit = DEFAULT_LIMIT }) {
  const safeLimit = normalizeLimit(limit);
  const [rows, unreadCount] = await Promise.all([
    RecruiterNotification.findAll({
      where: { company_id: companyId },
      order: [['created_at', 'DESC']],
      limit: safeLimit,
    }),
    getUnreadCount({ companyId, recruiterId }),
  ]);

  if (!rows.length) {
    return { items: [], unreadCount };
  }

  const ids = rows.map((r) => r.id);
  const reads = await RecruiterNotificationRead.findAll({
    where: {
      recruiter_id: recruiterId,
      notification_id: { [Op.in]: ids },
    },
    attributes: ['notification_id'],
  });

  const readSet = new Set(reads.map((r) => r.notification_id));
  const items = rows.map((row) => formatNotification(row, readSet));

  return { items, unreadCount };
}

async function getUnreadCount({ companyId, recruiterId }) {
  const rows = await sequelize.query(
    `
      SELECT COUNT(*) AS unreadCount
      FROM recruiter_notifications rn
      WHERE rn.company_id = :companyId
        AND NOT EXISTS (
          SELECT 1
          FROM recruiter_notification_reads rnr
          WHERE rnr.notification_id = rn.id
            AND rnr.recruiter_id = :recruiterId
        )
    `,
    {
      replacements: { companyId, recruiterId },
      type: QueryTypes.SELECT,
    },
  );

  return Number(rows[0]?.unreadCount || 0);
}

async function markAsRead({ notificationId, companyId, recruiterId }) {
  const notification = await RecruiterNotification.findOne({
    where: { id: notificationId, company_id: companyId },
  });

  if (!notification) {
    return null;
  }

  await RecruiterNotificationRead.findOrCreate({
    where: {
      notification_id: notificationId,
      recruiter_id: recruiterId,
    },
    defaults: {
      notification_id: notificationId,
      recruiter_id: recruiterId,
      read_at: new Date(),
    },
  });

  return formatNotification(notification, [notificationId]);
}

async function markAllAsRead({ companyId, recruiterId }) {
  const rows = await RecruiterNotification.findAll({
    where: { company_id: companyId },
    attributes: ['id'],
  });

  if (!rows.length) return { marked: 0 };

  const existing = await RecruiterNotificationRead.findAll({
    where: {
      recruiter_id: recruiterId,
      notification_id: { [Op.in]: rows.map((r) => r.id) },
    },
    attributes: ['notification_id'],
  });

  const existingSet = new Set(existing.map((r) => r.notification_id));
  const toCreate = rows
    .filter((r) => !existingSet.has(r.id))
    .map((r) => ({
      notification_id: r.id,
      recruiter_id: recruiterId,
      read_at: new Date(),
    }));

  if (toCreate.length) {
    await RecruiterNotificationRead.bulkCreate(toCreate);
  }

  return { marked: toCreate.length };
}

module.exports = {
  notifyNewApplication,
  listForRecruiter,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
