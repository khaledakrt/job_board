'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { env } = require('../config');
const { REFRESH_COOKIE_NAME } = require('../config/constants');

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionVersion: user.session_version || 0,
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      issuer: 'job-board-api',
      audience: 'job-board-client',
    }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      type: 'refresh',
      sessionVersion: user.session_version || 0,
      jti: generateSecureToken(16),
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
      issuer: 'job-board-api',
      audience: 'job-board-client',
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: 'job-board-api',
    audience: 'job-board-client',
  });
}

function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: 'job-board-api',
    audience: 'job-board-client',
  });

  if (decoded.type !== 'refresh') {
    throw new Error('Invalid refresh token type');
  }

  return decoded;
}

function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function hashSecureToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function getRefreshCookieOptions() {
  const maxAgeMs = parseRefreshExpiresToMs(env.JWT_REFRESH_EXPIRES_IN);
  const path = `${env.API_PREFIX.replace(/\/$/, '')}/auth`;

  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    maxAge: maxAgeMs,
    path,
  };
}

function getRefreshTokenExpiresAt() {
  return new Date(Date.now() + parseRefreshExpiresToMs(env.JWT_REFRESH_EXPIRES_IN));
}

function parseRefreshExpiresToMs(expiresIn) {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const value = Number(match[1]);
  const unit = match[2];

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

function setRefreshTokenCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
}

function clearRefreshTokenCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: `${env.API_PREFIX.replace(/\/$/, '')}/auth`,
  });
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateSecureToken,
  hashSecureToken,
  getRefreshTokenExpiresAt,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  REFRESH_COOKIE_NAME,
};
