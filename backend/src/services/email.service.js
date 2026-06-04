'use strict';

const { env } = require('../config');
const logger = require('../utils/logger');
const {
  getTransporter,
  defaultFrom,
  canAttemptSmtp,
  isSmtpConfigured,
} = require('./mailTransport.service');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function logDevLink(label, url) {
  logger.info(`[Email] ${label} → ${url}`);
  if (env.NODE_ENV === 'development') {
    console.log(`\n========== ${label} ==========\n${url}\n================================\n`);
  }
}

function brandButton(href, label) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:#0a66c2;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">${escapeHtml(label)}</a>`;
}

function wrapEmailHtml({ title, bodyHtml, footer }) {
  return `<!DOCTYPE html>
<html lang="fr">
<body style="font-family:Arial,sans-serif;color:#1f2937;padding:24px;">
  <h2 style="color:#0a66c2;">${escapeHtml(title)}</h2>
  ${bodyHtml}
  <p style="font-size:13px;color:#6b7280;margin-top:24px;">${escapeHtml(footer || 'Job Board')}</p>
</body>
</html>`;
}

/**
 * Envoi unique via Gmail (EMAIL_USER / EMAIL_PASS → SMTP dans env.js).
 */
async function sendMail({
  to,
  subject,
  text,
  html,
  replyTo,
  devLinkLabel,
  devLinkUrl,
}) {
  if (!canAttemptSmtp()) {
    logger.warn(`[Email] SMTP_HOST manquant — e-mail non envoyé à ${to}: ${subject}`);
    if (devLinkUrl) logDevLink(devLinkLabel || 'Lien', devLinkUrl);
    return { sent: false, channel: 'skipped', recipient: to, reason: 'smtp_not_configured' };
  }

  if (!isSmtpConfigured()) {
    logger.warn(
      `[Email] SMTP_USER/SMTP_PASS (ou EMAIL_USER/EMAIL_PASS) manquants — e-mail non envoyé à ${to}: ${subject}`
    );
    if (devLinkUrl) logDevLink(devLinkLabel || 'Lien', devLinkUrl);
    return { sent: false, channel: 'skipped', recipient: to, reason: 'smtp_auth_not_configured' };
  }

  try {
    const info = await getTransporter().sendMail({
      from: defaultFrom(),
      to,
      replyTo: replyTo || undefined,
      subject,
      text,
      html,
    });

    logger.info(`[Email] Envoyé à ${to} (messageId: ${info.messageId})`);
    return { sent: true, channel: 'smtp', recipient: to, messageId: info.messageId };
  } catch (error) {
    logger.error(`[Email] Échec envoi à ${to}`, error);
    if (devLinkUrl) logDevLink(devLinkLabel || 'Lien (secours)', devLinkUrl);
    return { sent: false, channel: 'smtp', recipient: to, error: error.message };
  }
}

async function sendVerificationEmail({ email, verificationToken, reason = 'register' }) {
  const verifyUrl = `${env.CLIENT_URL}/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;

  const isEmailChange = reason === 'email_change';
  const subject = isEmailChange
    ? 'Confirmez votre nouvelle adresse e-mail — Job Board'
    : 'Confirmez votre compte Job Board';

  const intro = isEmailChange
    ? 'Vous avez modifié votre adresse e-mail. Cliquez sur le bouton ci-dessous pour confirmer cette adresse et accéder à la plateforme.'
    : 'Merci de vous être inscrit sur Job Board. Cliquez sur le bouton ci-dessous pour activer votre compte.';

  const result = await sendMail({
    to: email,
    subject,
    text: `${intro}\n\n${verifyUrl}\n\nCe lien est valable jusqu'à utilisation.`,
    html: wrapEmailHtml({
      title: isEmailChange ? 'Confirmer votre nouvelle adresse' : 'Confirmer votre e-mail',
      bodyHtml: `<p>${escapeHtml(intro)}</p><p>${brandButton(verifyUrl, 'Confirmer mon e-mail')}</p><p style="font-size:13px;color:#6b7280;">Ou copiez ce lien : ${escapeHtml(verifyUrl)}</p>`,
    }),
    devLinkLabel: isEmailChange ? 'Confirmation nouvel e-mail' : 'Confirmation inscription',
    devLinkUrl: verifyUrl,
  });

  if (!result.sent) {
    logDevLink('Lien de confirmation (copiez dans le navigateur)', verifyUrl);
  }

  return { ...result, verifyUrl };
}

async function sendPasswordResetEmail({ email, resetToken }) {
  const resetUrl = `${env.CLIENT_URL}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;
  const hours = env.PASSWORD_RESET_EXPIRES_HOURS;

  const result = await sendMail({
    to: email,
    subject: 'Réinitialisation de votre mot de passe — Job Board',
    text: `Vous avez demandé une réinitialisation. Ouvrez ce lien (${hours} h) :\n\n${resetUrl}`,
    html: wrapEmailHtml({
      title: 'Réinitialisation du mot de passe',
      bodyHtml: `<p>Cliquez ci-dessous pour choisir un nouveau mot de passe. Lien valable ${hours} h.</p><p>${brandButton(resetUrl, 'Réinitialiser')}</p><p style="font-size:13px;color:#6b7280;">Ou copiez : ${escapeHtml(resetUrl)}</p>`,
    }),
    devLinkLabel: 'Réinitialisation mot de passe',
    devLinkUrl: resetUrl,
  });

  if (!result.sent) {
    logDevLink('Lien réinitialisation', resetUrl);
  }

  return result;
}

function buildCandidateAlertHtml({
  title,
  messageText,
  companyName,
  jobTitle,
  recruiterName,
}) {
  return wrapEmailHtml({
    title,
    bodyHtml: `
  <p style="line-height:1.6;">${escapeHtml(messageText).replace(/\n/g, '<br />')}</p>
  <table role="presentation" width="100%" style="margin-top:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
    <tr><td style="padding:14px 16px;font-size:14px;">
      <strong>Entreprise :</strong> ${escapeHtml(companyName)}<br />
      <strong>Poste :</strong> ${escapeHtml(jobTitle)}<br />
      <strong>Recruteur :</strong> ${escapeHtml(recruiterName)}
    </td></tr>
  </table>
  <p style="font-size:13px;color:#6b7280;margin-top:16px;">Vous pouvez répondre à cet e-mail pour contacter votre recruteur.</p>`,
    footer: 'Job Board — notification candidat',
  });
}

async function sendCandidateAlertEmail({
  to,
  replyTo,
  subject,
  messageText,
  companyName,
  jobTitle,
  recruiterName,
}) {
  return sendMail({
    to,
    replyTo,
    subject,
    text: messageText,
    html: buildCandidateAlertHtml({
      title: subject,
      messageText,
      companyName,
      jobTitle,
      recruiterName,
    }),
  });
}

async function sendTeamInviteEmail({
  to,
  companyName,
  inviterEmail,
  temporaryPassword,
  isNewAccount,
}) {
  const loginUrl = `${env.CLIENT_URL}/auth/login`;
  const subject = `Invitation à rejoindre ${companyName} — Job Board`;

  let text = `${inviterEmail} vous a ajouté à l'équipe recrutement de ${companyName} sur Job Board.\n\n`;
  text += `Connectez-vous : ${loginUrl}\n`;
  text += `E-mail de connexion : ${to}\n`;

  let bodyHtml = `<p><strong>${escapeHtml(inviterEmail)}</strong> vous a invité à rejoindre <strong>${escapeHtml(companyName)}</strong> sur Job Board.</p>`;
  bodyHtml += `<p>E-mail de connexion : <strong>${escapeHtml(to)}</strong></p>`;

  if (isNewAccount && temporaryPassword) {
    text += `Mot de passe temporaire : ${temporaryPassword}\n`;
    text += 'Changez ce mot de passe après votre première connexion (Paramètres).\n';
    bodyHtml += `<p>Mot de passe temporaire : <code style="background:#f3f4f6;padding:4px 8px;border-radius:4px;">${escapeHtml(temporaryPassword)}</code></p>`;
    bodyHtml +=
      '<p style="font-size:13px;color:#6b7280;">Changez ce mot de passe après votre première connexion dans Paramètres.</p>';
  } else {
    text += 'Utilisez le mot de passe de votre compte Job Board existant.\n';
    bodyHtml +=
      '<p>Utilisez le mot de passe de votre compte Job Board existant.</p>';
  }

  bodyHtml += `<p style="margin-top:20px;">${brandButton(loginUrl, 'Se connecter')}</p>`;

  return sendMail({
    to,
    subject,
    text,
    html: wrapEmailHtml({ title: 'Invitation équipe recrutement', bodyHtml }),
    devLinkLabel: 'Connexion équipe',
    devLinkUrl: loginUrl,
  });
}

async function sendRecruiterNewApplicationEmail({
  to,
  candidateName,
  jobTitle,
  dashboardUrl,
}) {
  const url = dashboardUrl || `${env.CLIENT_URL}/recruiter/applications`;
  const subject = `Nouvelle candidature — ${jobTitle}`;
  const text = `${candidateName} a postulé à votre offre « ${jobTitle} ».\n\nVoir les candidatures : ${url}`;

  const bodyHtml = `
  <p><strong>${escapeHtml(candidateName)}</strong> a postulé à votre offre <strong>« ${escapeHtml(jobTitle)} »</strong>.</p>
  <p style="margin-top:20px;">${brandButton(url, 'Voir les candidatures')}</p>`;

  return sendMail({
    to,
    subject,
    text,
    html: wrapEmailHtml({ title: 'Nouvelle candidature', bodyHtml }),
    devLinkLabel: 'Candidatures recruteur',
    devLinkUrl: url,
  });
}

async function sendContactFormEmail({ to, name, email, subject, message }) {
  const mailSubject = `[JobBoard Contact] ${subject}`;
  const text = [
    `Message reçu via le formulaire de contact JobBoard`,
    ``,
    `Nom : ${name}`,
    `E-mail : ${email}`,
    `Sujet : ${subject}`,
    ``,
    `Message :`,
    message,
  ].join('\n');

  const bodyHtml = `
  <p><strong>Nouveau message</strong> depuis le formulaire de contact.</p>
  <table style="margin:16px 0;font-size:14px;border-collapse:collapse;">
    <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Nom</td><td><strong>${escapeHtml(name)}</strong></td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">E-mail</td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Sujet</td><td>${escapeHtml(subject)}</td></tr>
  </table>
  <div style="background:#f3f4f6;padding:16px;border-radius:8px;white-space:pre-wrap;">${escapeHtml(message)}</div>`;

  return sendMail({
    to,
    subject: mailSubject,
    text,
    html: wrapEmailHtml({ title: 'Formulaire de contact', bodyHtml }),
    replyTo: email,
  });
}

module.exports = {
  sendMail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendCandidateAlertEmail,
  buildCandidateAlertHtml,
  sendTeamInviteEmail,
  sendRecruiterNewApplicationEmail,
  sendContactFormEmail,
};
