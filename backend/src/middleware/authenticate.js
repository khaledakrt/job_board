'use strict';

const ApiError = require('../utils/ApiError');
const { User } = require('../models');
const tokenService = require('../services/token.service');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token is required');
    }

    const token = authHeader.slice(7);
    const decoded = tokenService.verifyAccessToken(token);

    const user = await User.findByPk(decoded.sub, {
      attributes: ['id', 'email', 'role', 'is_verified', 'is_banned', 'ban_reason'],
    });

    if (!user) {
      throw ApiError.unauthorized('User no longer exists');
    }

    if (user.is_banned) {
      throw ApiError.forbidden(
        user.ban_reason || 'Votre compte a été suspendu. Contactez le support.'
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

module.exports = authenticate;
