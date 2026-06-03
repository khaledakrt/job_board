'use strict';

const { UserLoginEvent } = require('../models');
const { generateUuid } = require('../utils/uuid');

async function recordLogin({ userId, ipAddress, userAgent }) {
  await UserLoginEvent.create({
    id: generateUuid(),
    user_id: userId,
    ip_address: ipAddress || 'unknown',
    user_agent: userAgent ? String(userAgent).slice(0, 512) : null,
    created_at: new Date(),
  });
}

module.exports = {
  recordLogin,
};
