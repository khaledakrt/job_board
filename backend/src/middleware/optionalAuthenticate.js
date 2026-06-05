'use strict';

const { User } = require('../models');
const tokenService = require('../services/token.service');

/** Attaches req.user when a valid Bearer token is present; otherwise continues without user. */
async function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.slice(7);
    const decoded = tokenService.verifyAccessToken(token);
    const user = await User.findByPk(decoded.sub, {
      attributes: ['id', 'email', 'role', 'is_verified', 'is_banned', 'ban_reason'],
    });

    if (user && !user.is_banned) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.is_verified,
        isBanned: user.is_banned,
      };
    }
    return next();
  } catch {
    return next();
  }
}

module.exports = optionalAuthenticate;
