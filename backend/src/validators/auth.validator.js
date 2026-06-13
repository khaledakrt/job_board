'use strict';

const { z } = require('zod');
const { USER_ROLES } = require('../config/constants');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()[\]\-_=+{}|;:'",.<>/\\`~]).+$/,
    'Password must contain uppercase, lowercase, number, and special character'
  );

const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address')
    .max(255),
  password: passwordSchema,
  role: z
    .enum([USER_ROLES.CANDIDATE, USER_ROLES.RECRUITER])
    .optional()
    .default(USER_ROLES.CANDIDATE),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

const changeEmailSchema = z
  .object({
    newEmail: z.string().trim().toLowerCase().email('Invalid email address').max(255),
    confirmNewEmail: z.string().trim().toLowerCase().email('Invalid email address').max(255),
    currentPassword: z.string().min(1, 'Current password is required'),
  })
  .refine((data) => data.newEmail === data.confirmNewEmail, {
    message: 'New email and confirmation do not match',
    path: ['confirmNewEmail'],
  });

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
});

module.exports = {
  passwordSchema,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  changeEmailSchema,
  verifyEmailSchema,
  resendVerificationSchema,
};
