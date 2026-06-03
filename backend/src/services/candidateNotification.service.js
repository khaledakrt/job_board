'use strict';

const { CandidateNotification } = require('../models');

const DEFAULT_LIMIT = 30;

function formatNotification(row) {
  return {
    id: row.id,
    title: row.title,
    messageText: row.message_text,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
  };
}

async function listForCandidate({ candidateId, limit = DEFAULT_LIMIT }) {
  const rows = await CandidateNotification.findAll({
    where: { candidate_id: candidateId },
    order: [['created_at', 'DESC']],
    limit,
  });

  const items = rows.map(formatNotification);
  const unreadCount = items.filter((n) => !n.isRead).length;

  return { items, unreadCount };
}

async function getUnreadCount({ candidateId }) {
  return CandidateNotification.count({
    where: { candidate_id: candidateId, is_read: false },
  });
}

async function markAsRead({ notificationId, candidateId }) {
  const notification = await CandidateNotification.findOne({
    where: { id: notificationId, candidate_id: candidateId },
  });

  if (!notification) {
    return null;
  }

  if (!notification.is_read) {
    notification.is_read = true;
    await notification.save();
  }

  return formatNotification(notification);
}

async function markAllAsRead({ candidateId }) {
  const [marked] = await CandidateNotification.update(
    { is_read: true },
    { where: { candidate_id: candidateId, is_read: false } }
  );

  return { marked };
}

module.exports = {
  listForCandidate,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
