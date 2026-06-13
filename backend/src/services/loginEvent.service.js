'use strict';

const { Op } = require('sequelize');
const { UserLoginEvent } = require('../models');
const { generateUuid } = require('../utils/uuid');

const MAX_LOGIN_EVENTS_PER_USER = 50;

async function pruneOldLoginEvents(userId) {
  const oldEvents = await UserLoginEvent.findAll({
    where: { user_id: userId },
    attributes: ['id'],
    order: [
      ['created_at', 'DESC'],
      ['id', 'DESC'],
    ],
    offset: MAX_LOGIN_EVENTS_PER_USER,
    raw: true,
  });

  if (!oldEvents.length) return;

  await UserLoginEvent.destroy({
    where: {
      user_id: userId,
      id: { [Op.in]: oldEvents.map((event) => event.id) },
    },
  });
}

async function recordLogin({ userId, ipAddress, userAgent }) {
  await UserLoginEvent.create({
    id: generateUuid(),
    user_id: userId,
    ip_address: ipAddress || 'unknown',
    user_agent: userAgent ? String(userAgent).slice(0, 512) : null,
    created_at: new Date(),
  });
  await pruneOldLoginEvents(userId);
}

module.exports = {
  MAX_LOGIN_EVENTS_PER_USER,
  recordLogin,
};
