'use strict';

const path = require('path');
const { Op } = require('sequelize');
const { User, CandidateProfile, RecruiterProfile, Company, AdminAuditLog } = require('../models');
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
  return user.recruiterProfile?.company?.name || user.email;
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
  return `<!DOCTYPE html>
<html lang="fr">
<body style="font-family:Arial,sans-serif;color:#1f2937;padding:24px;">
  <p>Bonjour ${escapeHtml(name)},</p>
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
    const text = `Bonjour ${name},\n\n${message}\n\n${sender.lines.join('\n')}`;
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

  try {
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
    console.warn('Admin audit log failed:', err.message);
  }

  return {
    requested: uniqueIds.length,
    sent,
    failed,
  };
}

module.exports = {
  listAnnouncementRecipients,
  sendAnnouncement,
  SENDERS,
};
