'use strict';

const { User } = require('../models');
const tokenService = require('../services/token.service');
const { USER_ROLES } = require('../config/constants');

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
      attributes: [
        'id',
        'email',
        'role',
        'is_verified',
        'is_banned',
        'ban_reason',
        'password_changed_at',
        'session_version',
      ],
    });

    const sessionIsCurrent =
      user &&
      !user.is_banned &&
      !tokenIssuedBeforePasswordChange(decoded, user.password_changed_at) &&
      (decoded.sessionVersion || 0) === (user.session_version || 0) &&
      (user.is_verified || user.role === USER_ROLES.ADMIN);

    if (sessionIsCurrent) {
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

function tokenIssuedBeforePasswordChange(decoded, passwordChangedAt) {
  if (!passwordChangedAt || !decoded.iat) return false;
  return decoded.iat * 1000 <= new Date(passwordChangedAt).getTime();
}

module.exports = optionalAuthenticate;
