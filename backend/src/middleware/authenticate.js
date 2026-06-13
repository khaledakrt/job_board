'use strict';

const ApiError = require('../utils/ApiError');
const { User } = require('../models');
const tokenService = require('../services/token.service');
const { USER_ROLES } = require('../config/constants');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token is required');
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

    if (!user) {
      throw ApiError.unauthorized('User no longer exists');
    }

    if (user.is_banned) {
      throw ApiError.forbidden(
        user.ban_reason || 'Votre compte a été suspendu. Contactez le support.'
      );
    }

    if (tokenIssuedBeforePasswordChange(decoded, user.password_changed_at)) {
      throw ApiError.unauthorized('Session expired after password change');
    }

    if ((decoded.sessionVersion || 0) !== (user.session_version || 0)) {
      throw ApiError.unauthorized('Session expired after password change');
    }

    if (!user.is_verified && user.role !== USER_ROLES.ADMIN) {
      throw ApiError.forbidden(
        'Adresse e-mail non confirmée. Ouvrez le lien reçu par e-mail ou demandez un nouvel envoi.'
      );
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.is_verified,
      isBanned: user.is_banned,
    };

    return next();
  } catch (error) {
    if (error.isOperational) {
      return next(error);
    }
    return next(ApiError.unauthorized('Invalid or expired access token'));
  }
}

function tokenIssuedBeforePasswordChange(decoded, passwordChangedAt) {
  if (!passwordChangedAt || !decoded.iat) return false;
  return decoded.iat * 1000 <= new Date(passwordChangedAt).getTime();
}

module.exports = authenticate;
