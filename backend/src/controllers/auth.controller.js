'use strict';

const authService = require('../services/auth.service');
const tokenService = require('../services/token.service');
const asyncHandler = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.validatedBody);

  res.status(201).json({
    success: true,
    message: result.message,
    data: {
      id: result.id,
      email: result.email,
      role: result.role,
      isVerified: result.isVerified,
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.validatedBody);

  tokenService.setRefreshTokenCookie(res, result.refreshToken);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.validatedBody);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.validatedBody);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies[tokenService.REFRESH_COOKIE_NAME];

  const result = await authService.refreshSession(refreshToken);

  tokenService.setRefreshTokenCookie(res, result.refreshToken);

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword({
    userId: req.user.id,
    currentPassword: req.validatedBody.currentPassword,
    newPassword: req.validatedBody.newPassword,
  });

  tokenService.clearRefreshTokenCookie(res);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.validatedBody);

  res.status(200).json({
    success: true,
    message: result.message,
    data: { email: result.email },
  });
});

const resendVerification = asyncHandler(async (req, res) => {
  const result = await authService.resendVerificationEmail(req.validatedBody);

  const body = {
    success: true,
    message: result.message,
  };
  if (result.devVerifyUrl) {
    body.data = { devVerifyUrl: result.devVerifyUrl };
  }
  res.status(200).json(body);
});

const changeEmail = asyncHandler(async (req, res) => {
  const result = await authService.changeEmail({
    userId: req.user.id,
    newEmail: req.validatedBody.newEmail,
    currentPassword: req.validatedBody.currentPassword,
  });

  tokenService.clearRefreshTokenCookie(res);

  const data = { email: result.email };
  if (result.devVerifyUrl) {
    data.devVerifyUrl = result.devVerifyUrl;
  }

  res.status(200).json({
    success: true,
    message: result.message,
    data,
  });
});

module.exports = {
  register,
  login,
  refresh,
  forgotPassword,
  resetPassword,
  changePassword,
  changeEmail,
  verifyEmail,
  resendVerification,
};
