'use strict';

const { Op, fn, col, where } = require('sequelize');
const { User, RefreshSession } = require('../models');
const { env } = require('../config');
const { USER_ROLES } = require('../config/constants');
const ApiError = require('../utils/ApiError');
const { generateUuid } = require('../utils/uuid');
const { hashPassword, comparePassword } = require('../utils/password');
const tokenService = require('./token.service');
const emailService = require('./email.service');
const loginEventService = require('./loginEvent.service');

function buildVerificationExpiry() {
  const expires = new Date();
  expires.setHours(expires.getHours() + env.EMAIL_VERIFICATION_EXPIRES_HOURS);
  return expires;
}

async function createRefreshSession({ user, refreshToken, ipAddress, userAgent }) {
  await RefreshSession.create({
    id: generateUuid(),
    user_id: user.id,
    token_hash: tokenService.hashSecureToken(refreshToken),
    user_agent: userAgent ? String(userAgent).slice(0, 500) : null,
    ip_address: ipAddress || null,
    expires_at: tokenService.getRefreshTokenExpiresAt(),
    revoked_at: null,
    created_at: new Date(),
  });
}

async function revokeRefreshToken(refreshToken) {
  if (!refreshToken) return;
  await RefreshSession.update(
    { revoked_at: new Date() },
    {
      where: {
        token_hash: tokenService.hashSecureToken(refreshToken),
        revoked_at: null,
      },
    }
  );
}

async function revokeAllUserRefreshSessions(userId) {
  await RefreshSession.update(
    { revoked_at: new Date() },
    {
      where: {
        user_id: userId,
        revoked_at: null,
      },
    }
  );
}

async function register({ email, password, role }) {
  const existingUser = await User.findOne({ where: { email } });

  if (existingUser) {
    throw ApiError.conflict('Email is already registered');
  }

  const verificationToken = tokenService.generateSecureToken();
  const verificationExpires = buildVerificationExpiry();
  const passwordHash = await hashPassword(password);

  const user = await User.create({
    id: generateUuid(),
    email,
    password_hash: passwordHash,
    role: role || USER_ROLES.CANDIDATE,
    is_verified: false,
    verification_token: tokenService.hashSecureToken(verificationToken),
    verification_expires: verificationExpires,
    reset_token: null,
    reset_expires: null,
    created_at: new Date(),
  });

  await emailService.sendVerificationEmail({
    email: user.email,
    verificationToken,
  });

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isVerified: user.is_verified,
    message: 'Registration successful. Please verify your email before logging in.',
  };
}

async function login({ email, password, ipAddress, userAgent }) {
  const user = await User.findOne({ where: { email } });

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isPasswordValid = await comparePassword(password, user.password_hash);

  if (!isPasswordValid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (user.is_banned) {
    throw ApiError.forbidden(
      user.ban_reason || 'Votre compte a été suspendu. Contactez le support.'
    );
  }

  if (!user.is_verified && user.role !== USER_ROLES.ADMIN) {
    throw ApiError.forbidden(
      'Adresse e-mail non confirmée. Ouvrez le lien reçu par e-mail ou demandez un nouvel envoi.'
    );
  }

  if (ipAddress) {
    await user.update({ last_login_ip: ipAddress });
    await loginEventService.recordLogin({
      userId: user.id,
      ipAddress,
      userAgent,
    });
  }

  const accessToken = tokenService.signAccessToken(user);
  const refreshToken = tokenService.signRefreshToken(user);
  await createRefreshSession({ user, refreshToken, ipAddress, userAgent });

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.is_verified,
    },
    accessToken,
    refreshToken,
  };
}

async function forgotPassword({ email }) {
  const user = await User.findOne({ where: { email } });

  if (user) {
    const resetToken = tokenService.generateSecureToken();
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + env.PASSWORD_RESET_EXPIRES_HOURS);

    await user.update({
      reset_token: tokenService.hashSecureToken(resetToken),
      reset_expires: resetExpires,
    });

    await emailService.sendPasswordResetEmail({
      email: user.email,
      resetToken,
    });
  }

  return {
    message:
      'If an account with that email exists, a password reset link has been sent.',
  };
}

async function resetPassword({ token, password }) {
  const tokenHash = tokenService.hashSecureToken(token);
  const user = await User.findOne({
    where: {
      reset_token: tokenHash,
      reset_expires: {
        [Op.gt]: new Date(),
      },
    },
  });

  if (!user) {
    throw ApiError.badRequest('Invalid or expired reset token');
  }

  const passwordHash = await hashPassword(password);

  await user.update({
    password_hash: passwordHash,
    password_changed_at: new Date(),
    session_version: (user.session_version || 0) + 1,
    reset_token: null,
    reset_expires: null,
  });
  await revokeAllUserRefreshSessions(user.id);

  return {
    message: 'Password has been reset successfully. You can now log in.',
  };
}

async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await User.findByPk(userId);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const isCurrentValid = await comparePassword(currentPassword, user.password_hash);

  if (!isCurrentValid) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  const isSamePassword = await comparePassword(newPassword, user.password_hash);

  if (isSamePassword) {
    throw ApiError.badRequest('New password must be different from the current password');
  }

  const passwordHash = await hashPassword(newPassword);

  await user.update({
    password_hash: passwordHash,
    password_changed_at: new Date(),
    session_version: (user.session_version || 0) + 1,
  });
  await revokeAllUserRefreshSessions(user.id);

  return {
    message: 'Password changed successfully',
  };
}

async function changeEmail({ userId, newEmail, currentPassword }) {
  const user = await User.findByPk(userId);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const normalizedNew = newEmail.trim().toLowerCase();
  const normalizedCurrent = user.email.trim().toLowerCase();

  if (normalizedNew === normalizedCurrent) {
    throw ApiError.badRequest(
      'La nouvelle adresse doit être différente de votre e-mail actuel'
    );
  }

  const isPasswordValid = await comparePassword(currentPassword, user.password_hash);

  if (!isPasswordValid) {
    throw ApiError.unauthorized('Mot de passe actuel incorrect');
  }

  const emailTaken = await User.findOne({
    where: {
      [Op.and]: [
        where(fn('LOWER', col('email')), normalizedNew),
        { id: { [Op.ne]: user.id } },
      ],
    },
    attributes: ['id', 'email'],
  });

  if (emailTaken) {
    throw ApiError.conflict(
      'Cette adresse e-mail est déjà associée à un autre compte. Choisissez une autre adresse.'
    );
  }

  const verificationToken = tokenService.generateSecureToken();
  const verificationExpires = buildVerificationExpiry();

  try {
    await user.update({
      email: normalizedNew,
      is_verified: false,
      verification_token: tokenService.hashSecureToken(verificationToken),
      verification_expires: verificationExpires,
      reset_token: null,
      reset_expires: null,
      session_version: (user.session_version || 0) + 1,
    });
    await revokeAllUserRefreshSessions(user.id);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw ApiError.conflict(
        'Cette adresse e-mail est déjà associée à un autre compte. Choisissez une autre adresse.'
      );
    }
    throw error;
  }

  const mailResult = await emailService.sendVerificationEmail({
    email: normalizedNew,
    verificationToken,
    reason: 'email_change',
  });

  const mailHint = mailResult.sent
    ? 'Consultez votre boîte mail (et les spams).'
    : 'SMTP non configuré : le lien de confirmation est affiché dans les logs du serveur backend.';

  const payload = {
    message: `E-mail mis à jour. ${mailHint} Cliquez sur le lien de confirmation avant de vous reconnecter.`,
    email: normalizedNew,
    verificationSent: mailResult.sent,
  };

  if (env.NODE_ENV === 'development' && !mailResult.sent && mailResult.verifyUrl) {
    payload.devVerifyUrl = mailResult.verifyUrl;
  }

  return payload;
}

async function verifyEmail({ token }) {
  const trimmed = String(token || '').trim();

  if (!trimmed) {
    throw ApiError.badRequest('Lien de confirmation invalide');
  }

  const tokenHash = tokenService.hashSecureToken(trimmed);
  const user = await User.findOne({
    where: {
      verification_token: tokenHash,
      verification_expires: { [Op.gt]: new Date() },
    },
  });

  if (!user) {
    throw ApiError.badRequest('Lien de confirmation invalide, expiré ou déjà utilisé');
  }

  await user.update({
    is_verified: true,
    verification_token: null,
    verification_expires: null,
  });

  return {
    message: 'Votre adresse e-mail est confirmée. Vous pouvez vous connecter.',
    email: user.email,
  };
}

async function resendVerificationEmail({ email }) {
  const normalized = email.trim().toLowerCase();
  const user = await User.findOne({ where: { email: normalized } });

  if (!user) {
    return {
      message:
        'Si un compte existe avec cette adresse, un e-mail de confirmation a été envoyé.',
    };
  }

  if (user.is_verified) {
    return {
      message: 'Cette adresse e-mail est déjà confirmée. Vous pouvez vous connecter.',
    };
  }

  const verificationToken = tokenService.generateSecureToken();
  const verificationExpires = buildVerificationExpiry();
  await user.update({
    verification_token: tokenService.hashSecureToken(verificationToken),
    verification_expires: verificationExpires,
  });

  const mailResult = await emailService.sendVerificationEmail({
    email: user.email,
    verificationToken,
    reason: 'register',
  });

  const result = {
    message:
      'Si un compte existe avec cette adresse, un e-mail de confirmation a été envoyé.',
  };

  if (env.NODE_ENV === 'development' && !mailResult.sent && mailResult.verifyUrl) {
    result.devVerifyUrl = mailResult.verifyUrl;
  }

  return result;
}

async function refreshSession(refreshToken, { ipAddress, userAgent } = {}) {
  if (!refreshToken) {
    throw ApiError.unauthorized('Refresh token is missing');
  }

  const decoded = tokenService.verifyRefreshToken(refreshToken);
  const session = await RefreshSession.findOne({
    where: {
      token_hash: tokenService.hashSecureToken(refreshToken),
      revoked_at: null,
      expires_at: { [Op.gt]: new Date() },
    },
  });

  if (!session) {
    throw ApiError.unauthorized('Refresh session is invalid or expired');
  }

  if (session.user_id !== decoded.sub) {
    await session.update({ revoked_at: new Date() });
    throw ApiError.unauthorized('Refresh session is invalid');
  }

  const user = await User.findByPk(decoded.sub);

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

  const [revokedCount] = await RefreshSession.update(
    { revoked_at: new Date() },
    {
      where: {
        id: session.id,
        revoked_at: null,
        expires_at: { [Op.gt]: new Date() },
      },
    }
  );

  if (revokedCount !== 1) {
    throw ApiError.unauthorized('Refresh session is invalid or expired');
  }

  const accessToken = tokenService.signAccessToken(user);
  const newRefreshToken = tokenService.signRefreshToken(user);
  await createRefreshSession({
    user,
    refreshToken: newRefreshToken,
    ipAddress,
    userAgent,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.is_verified,
    },
    accessToken,
    refreshToken: newRefreshToken,
  };
}

async function logout(refreshToken) {
  await revokeRefreshToken(refreshToken);
  return { message: 'Logged out successfully' };
}

function tokenIssuedBeforePasswordChange(decoded, passwordChangedAt) {
  if (!passwordChangedAt || !decoded.iat) return false;
  return decoded.iat * 1000 <= new Date(passwordChangedAt).getTime();
}

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  changeEmail,
  verifyEmail,
  resendVerificationEmail,
  refreshSession,
  logout,
};
