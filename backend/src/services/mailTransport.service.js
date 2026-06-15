'use strict';

const nodemailer = require('nodemailer');
const { env } = require('../config');

let transporter;

/** True when SMTP credentials are set (production relay). */
function isSmtpConfigured() {
  return Boolean(env.SMTP_USER && env.SMTP_PASS);
}

/** True when we should attempt SMTP (host set — works with Mailpit without auth). */
function canAttemptSmtp() {
  return Boolean(env.SMTP_HOST);
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: isSmtpConfigured()
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          }
        : undefined,
      tls: env.NODE_ENV === 'development' ? { rejectUnauthorized: false } : undefined,
    });
  }

  return transporter;
}

function formatFrom(name, email) {
  return `"${name}" <${email}>`;
}

function defaultFrom() {
  return formatFrom(env.SMTP_FROM_NAME, env.SMTP_FROM_EMAIL);
}

function systemFrom() {
  return formatFrom(
    env.SYSTEM_EMAIL_FROM_NAME || env.SMTP_FROM_NAME,
    env.SYSTEM_EMAIL_FROM_EMAIL || env.SMTP_FROM_EMAIL
  );
}

module.exports = {
  isSmtpConfigured,
  canAttemptSmtp,
  getTransporter,
  defaultFrom,
  systemFrom,
};
