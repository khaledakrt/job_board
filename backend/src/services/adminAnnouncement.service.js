'use strict';

const path = require('path');
const { Op } = require('sequelize');
const {
  User,
  CandidateProfile,
  RecruiterProfile,
  Company,
  AdminAuditLog,
  AdminSentMessage,
} = require('../models');
const { USER_ROLES } = require('../config/constants');
const ApiError = require('../utils/ApiError');
const { generateUuid } = require('../utils/uuid');
const { sendMail } = require('./email.service');

const MAX_RECIPIENTS = 200;

const SIGNATURE_LOGO = path.join(__dirname, '../../assets/email/jobboard-signature.png');
const SITE_URL = 'https://tun-job-board.com';

const SENDERS = Object.freeze({
  support: {
    name: 'Support Tun Job',
    email: 'support@tun-job-board.com',
    lines: [
      'Cordialement,',
      'Support Tun Job-Board',
      'Assistance technique et aide aux utilisateurs',
      `Site : ${SITE_URL}`,
    ],
  },
  info: {
    name: 'Informations Tun Job',
    email: 'info@tun-job-board.com',
    lines: [
      'Cordialement,',
      'Informations Tun Job-Board',
      'Demandes d’informations générales',
      `Site : ${SITE_URL}`,
    ],
  },
  administration: {
    name: 'Administration Tun Job',
    email: 'administration@tun-job-board.com',
    lines: [
      'Cordialement,',
      'Support Tun Job-Board',
      'Assistance technique et aide aux utilisateurs',
      `Site : ${SITE_URL}`,
    ],
  },
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function displayName(user) {
  const candidate = user.candidateProfile;
  const person = `${candidate?.first_name || ''} ${candidate?.last_name || ''}`.trim();
  if (person) return person;
  return user.recruiterProfile?.company?.name || '';
}

function formatRecipient(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: displayName(user),
  };
}

async function listAnnouncementRecipients({ role, search } = {}) {
  const where = {
    is_banned: false,
    role:
      role === USER_ROLES.CANDIDATE || role === USER_ROLES.RECRUITER
        ? role
        : { [Op.in]: [USER_ROLES.CANDIDATE, USER_ROLES.RECRUITER] },
  };

  const users = await User.findAll({
    where,
    attributes: ['id', 'email', 'role'],
    include: [
      {
        model: CandidateProfile,
        as: 'candidateProfile',
        attributes: ['first_name', 'last_name'],
        required: false,
      },
      {
        model: RecruiterProfile,
        as: 'recruiterProfile',
        attributes: ['id'],
        required: false,
        include: [{ model: Company, as: 'company', attributes: ['name'] }],
      },
    ],
    order: [['email', 'ASC']],
    limit: 1000,
  });

  const term = String(search || '').trim().toLowerCase();
  const items = users.map(formatRecipient).filter((item) => {
    if (!term) return true;
    return item.email.toLowerCase().includes(term) || item.name.toLowerCase().includes(term);
  });

  return { items, senders: Object.entries(SENDERS).map(([key, sender]) => ({ key, ...sender })) };
}

function signatureHtml(sender) {
  const lines = sender.lines
    .map((line, index) => {
      const style = index === 1 ? 'margin:0;font-weight:700;color:#0f172a;' : 'margin:0;color:#334155;';
      const content = line.startsWith('Site')
        ? `Site : <a href="${SITE_URL}" style="color:#0a66c2;text-decoration:none;">tun-job-board.com</a>`
        : escapeHtml(line);
      return `<p style="${style}">${content}</p>`;
    })
    .join('');
  return `
  <div style="margin-top:28px;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;">
    ${lines}
    <p style="margin:12px 0 0;"><img src="cid:jobboard-signature" width="220" alt="JobBoard TN" style="display:block;border:0;" /></p>
  </div>`;
}

function buildHtml({ name, message, sender }) {
  const body = escapeHtml(message).replace(/\n/g, '<br />');
  const hello = name ? `Bonjour ${escapeHtml(name)},` : 'Bonjour,';
  return `<!DOCTYPE html>
<html lang="fr">
<body style="font-family:Arial,sans-serif;color:#1f2937;padding:24px;">
  <p>${hello}</p>
  <p style="line-height:1.55;">${body}</p>
  ${signatureHtml(sender)}
</body>
</html>`;
}

async function sendAnnouncement({ actorId, senderKey, subject, message, userIds }) {
  const sender = SENDERS[senderKey];
  if (!sender) {
    throw ApiError.badRequest('Expéditeur invalide');
  }
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw ApiError.badRequest('Choisissez au moins un destinataire');
  }
  if (userIds.length > MAX_RECIPIENTS) {
    throw ApiError.badRequest(`Maximum ${MAX_RECIPIENTS} destinataires par envoi`);
  }

  const uniqueIds = [...new Set(userIds)];
  const users = await User.findAll({
    where: {
      id: { [Op.in]: uniqueIds },
      is_banned: false,
      role: { [Op.in]: [USER_ROLES.CANDIDATE, USER_ROLES.RECRUITER] },
    },
    attributes: ['id', 'email', 'role'],
    include: [
      {
        model: CandidateProfile,
        as: 'candidateProfile',
        attributes: ['first_name', 'last_name'],
        required: false,
      },
      {
        model: RecruiterProfile,
        as: 'recruiterProfile',
        attributes: ['id'],
        required: false,
        include: [{ model: Company, as: 'company', attributes: ['name'] }],
      },
    ],
  });

  if (!users.length) {
    throw ApiError.badRequest('Aucun destinataire valide');
  }

  const from = `"${sender.name}" <${sender.email}>`;
  const failed = [];
  let sent = 0;

  for (const user of users) {
    const name = displayName(user);
    const hello = name ? `Bonjour ${name},` : 'Bonjour,';
    const text = `${hello}\n\n${message}\n\n${sender.lines.join('\n')}`;
    const result = await sendMail({
      to: user.email,
      from,
      replyTo: sender.email,
      subject,
      text,
      html: buildHtml({ name, message, sender }),
      attachments: [
        {
          filename: 'jobboard-signature.png',
          path: SIGNATURE_LOGO,
          cid: 'jobboard-signature',
        },
      ],
    });
    if (result.sent) {
      sent += 1;
    } else {
      failed.push({
        email: user.email,
        error: String(result.error || result.reason || 'envoi impossible').slice(0, 180),
      });
    }
  }

  const recipients = users.map((user) => {
    const failure = failed.find((item) => item.email === user.email);
    return {
      email: user.email,
      name: displayName(user),
      role: user.role,
      sent: !failure,
      error: failure?.error || null,
    };
  });

  try {
    await AdminSentMessage.create({
      id: generateUuid(),
      actor_id: actorId || null,
      sender_name: sender.name,
      sender_email: sender.email,
      subject,
      body: message,
      recipients,
      sent_count: sent,
      failed_count: failed.length,
      created_at: new Date(),
    });
    await AdminAuditLog.create({
      id: generateUuid(),
      actor_id: actorId || null,
      action: 'announcement.send',
      target_type: 'users',
      target_id: null,
      metadata: {
        sender: sender.email,
        subject,
        requested: uniqueIds.length,
        sent,
        failed: failed.length,
      },
      created_at: new Date(),
    });
  } catch (err) {
    console.warn('Admin sent message log failed:', err.message);
  }

  return {
    requested: uniqueIds.length,
    sent,
    failed,
  };
}

function signatureLinesFor(email) {
  const match = Object.values(SENDERS).find((sender) => sender.email === email);
  return match ? match.lines : [];
}

function formatSentMessage(row, roleByEmail) {
  const recipients = (Array.isArray(row.recipients) ? row.recipients : []).map((person) => {
    const email = String(person?.email || '');
    return {
      email,
      name: person?.name || email,
      role: person?.role || roleByEmail.get(email.toLowerCase()) || null,
      sent: person?.sent !== false,
      error: person?.error || null,
    };
  });
  return {
    id: row.id,
    senderName: row.sender_name,
    senderEmail: row.sender_email,
    subject: row.subject,
    body: row.body,
    signature: signatureLinesFor(row.sender_email),
    recipients,
    sentCount: row.sent_count,
    failedCount: row.failed_count,
    createdAt: row.created_at,
  };
}

function messageMatchesSearch(message, term) {
  if (!term) return true;
  const haystack = [
    message.subject,
    message.body,
    message.senderName,
    message.senderEmail,
    ...message.recipients.flatMap((person) => [person.name, person.email]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(term);
}

async function listSentAnnouncements({ search, role, sender, page, limit } = {}) {
  const rows = await AdminSentMessage.findAll({
    order: [['created_at', 'DESC']],
    limit: 500,
  });
  const emails = new Set();
  for (const row of rows) {
    for (const person of Array.isArray(row.recipients) ? row.recipients : []) {
      if (person?.email) emails.add(String(person.email).toLowerCase());
    }
  }
  const users = emails.size
    ? await User.findAll({
        where: { email: { [Op.in]: [...emails] } },
        attributes: ['email', 'role'],
      })
    : [];
  const roleByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user.role]));
  const term = String(search || '').trim().toLowerCase();
  const senderEmail = String(sender || '').trim().toLowerCase();

  const matched = [];
  for (const row of rows) {
    const message = formatSentMessage(row, roleByEmail);
    if (senderEmail && message.senderEmail.toLowerCase() !== senderEmail) continue;
    if (role && !message.recipients.some((person) => person.role === role)) continue;
    if (!messageMatchesSearch(message, term)) continue;
    matched.push(message);
  }

  const pageNumber = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(limit) || 10));
  const totalItems = matched.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(pageNumber, totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    items: matched.slice(start, start + pageSize),
    pagination: {
      page: currentPage,
      limit: pageSize,
      totalItems,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    },
  };
}

async function deleteSentAnnouncement(id) {
  const row = await AdminSentMessage.findByPk(id);
  if (!row) {
    throw ApiError.notFound('Message introuvable');
  }
  await row.destroy();
}

module.exports = {
  listAnnouncementRecipients,
  listSentAnnouncements,
  deleteSentAnnouncement,
  sendAnnouncement,
  SENDERS,
};
