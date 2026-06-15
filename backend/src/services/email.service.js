'use strict';

const { env } = require('../config');
const logger = require('../utils/logger');
const {
  getTransporter,
  defaultFrom,
  systemFrom,
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
  if (env.NODE_ENV === 'development') {
    logger.info(`[Email] ${label} → ${url}`);
    console.log(`\n========== ${label} ==========\n${url}\n================================\n`);
  }
}

function brandButton(href, label) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:#0a66c2;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">${escapeHtml(label)}</a>`;
}

function buildDefaultSignature() {
  return `
  <table role="presentation" width="100%" style="margin-top:28px;border-top:1px solid #e5e7eb;padding-top:18px;">
    <tr>
      <td style="font-size:14px;line-height:1.6;color:#374151;">
        <strong style="color:#0a66c2;font-size:15px;">L'équipe Tun Job</strong><br />
        Plateforme emploi, recrutement et formation en Tunisie<br />
        <a href="${escapeHtml(env.CLIENT_URL)}" style="color:#0a66c2;text-decoration:none;">${escapeHtml(env.CLIENT_URL)}</a>
      </td>
    </tr>
  </table>
  <p style="font-size:12px;color:#6b7280;margin-top:14px;">
    Ceci est un message automatique. Merci de ne pas répondre directement à cet e-mail.
  </p>`;
}

function wrapEmailHtml({ title, bodyHtml, footer, signatureHtml }) {
  return `<!DOCTYPE html>
<html lang="fr">
<body style="font-family:Arial,sans-serif;color:#1f2937;padding:24px;">
  <h2 style="color:#0a66c2;">${escapeHtml(title)}</h2>
  ${bodyHtml}
  ${signatureHtml === false ? '' : signatureHtml || buildDefaultSignature()}
  ${footer ? `<p style="font-size:13px;color:#6b7280;margin-top:24px;">${escapeHtml(footer)}</p>` : ''}
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
  from,
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
      from: from || defaultFrom(),
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
    ? 'Confirmez votre nouvelle adresse e-mail — Tun Job'
    : 'Confirmez votre compte Tun Job';

  const intro = isEmailChange
    ? 'Vous avez modifié votre adresse e-mail. Cliquez sur le bouton ci-dessous pour confirmer cette adresse et accéder à la plateforme.'
    : 'Merci de vous être inscrit sur Tun Job. Cliquez sur le bouton ci-dessous pour activer votre compte.';

  const result = await sendMail({
    from: systemFrom(),
    to: email,
    subject,
    text: `${intro}\n\n${verifyUrl}\n\nCe lien est valable jusqu'à utilisation.\n\nL'équipe Tun Job\n${env.CLIENT_URL}\n\nCeci est un message automatique. Merci de ne pas répondre directement à cet e-mail.`,
    html: wrapEmailHtml({
      title: isEmailChange ? 'Confirmer votre nouvelle adresse' : 'Confirmer votre e-mail',
      bodyHtml: `<p>${escapeHtml(intro)}</p><p>${brandButton(verifyUrl, 'Confirmer mon e-mail')}</p><p style="font-size:13px;color:#6b7280;">Ou copiez ce lien : ${escapeHtml(verifyUrl)}</p>`,
    }),
    devLinkLabel: isEmailChange ? 'Confirmation nouvel e-mail' : 'Confirmation inscription',
    devLinkUrl: verifyUrl,
  });

  if (!result.sent && env.NODE_ENV === 'development') {
    logDevLink('Lien de confirmation (copiez dans le navigateur)', verifyUrl);
  }

  return { ...result, verifyUrl };
}

async function sendPasswordResetEmail({ email, resetToken }) {
  const resetUrl = `${env.CLIENT_URL}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;
  const hours = env.PASSWORD_RESET_EXPIRES_HOURS;

  const result = await sendMail({
    from: systemFrom(),
    to: email,
    subject: 'Réinitialisation de votre mot de passe — Tun Job',
    text: `Vous avez demandé une réinitialisation. Ouvrez ce lien (${hours} h) :\n\n${resetUrl}\n\nL'équipe Tun Job\n${env.CLIENT_URL}\n\nCeci est un message automatique. Merci de ne pas répondre directement à cet e-mail.`,
    html: wrapEmailHtml({
      title: 'Réinitialisation du mot de passe',
      bodyHtml: `<p>Cliquez ci-dessous pour choisir un nouveau mot de passe. Lien valable ${hours} h.</p><p>${brandButton(resetUrl, 'Réinitialiser')}</p><p style="font-size:13px;color:#6b7280;">Ou copiez : ${escapeHtml(resetUrl)}</p>`,
    }),
    devLinkLabel: 'Réinitialisation mot de passe',
    devLinkUrl: resetUrl,
  });

  if (!result.sent && env.NODE_ENV === 'development') {
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
  setupToken,
  isNewAccount,
}) {
  const loginUrl = `${env.CLIENT_URL}/auth/login`;
  const setupUrl = setupToken
    ? `${env.CLIENT_URL}/auth/reset-password?token=${encodeURIComponent(setupToken)}`
    : null;
  const subject = `Invitation à rejoindre ${companyName} — Job Board`;

  let text = `${inviterEmail} vous a ajouté à l'équipe recrutement de ${companyName} sur Job Board.\n\n`;
  text += `Connectez-vous : ${loginUrl}\n`;
  text += `E-mail de connexion : ${to}\n`;

  let bodyHtml = `<p><strong>${escapeHtml(inviterEmail)}</strong> vous a invité à rejoindre <strong>${escapeHtml(companyName)}</strong> sur Job Board.</p>`;
  bodyHtml += `<p>E-mail de connexion : <strong>${escapeHtml(to)}</strong></p>`;

  if (isNewAccount && setupUrl) {
    text += `Définissez votre mot de passe : ${setupUrl}\n`;
    text += 'Ce lien est personnel et expire rapidement.\n';
    bodyHtml += `<p style="margin-top:20px;">${brandButton(setupUrl, 'Définir mon mot de passe')}</p>`;
    bodyHtml +=
      '<p style="font-size:13px;color:#6b7280;">Ce lien est personnel et expire rapidement.</p>';
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
    devLinkLabel: setupUrl ? 'Définition mot de passe équipe' : 'Connexion équipe',
    devLinkUrl: setupUrl || loginUrl,
  });
}

async function sendProviderParticipationEmail({
  to,
  candidateName,
  offeringTitle,
  offeringKind,
  participationLabel,
  dashboardUrl,
}) {
  const url =
    dashboardUrl ||
    `${env.CLIENT_URL}/provider/centre/participants`;
  const subject = `${participationLabel} — ${offeringTitle}`;
  const text = `${candidateName} — ${participationLabel} pour votre ${offeringKind} « ${offeringTitle} ».\n\nVoir les participants : ${url}`;

  const bodyHtml = `
  <p><strong>${escapeHtml(candidateName)}</strong> — <strong>${escapeHtml(participationLabel)}</strong></p>
  <p>Pour votre ${escapeHtml(offeringKind)} <strong>« ${escapeHtml(offeringTitle)} »</strong>.</p>
  <p style="margin-top:20px;">${brandButton(url, 'Voir les participants')}</p>`;

  return sendMail({
    to,
    subject,
    text,
    html: wrapEmailHtml({ title: 'Nouveau participant', bodyHtml }),
    devLinkLabel: 'Participants centre',
    devLinkUrl: url,
  });
}

async function sendRecruiterNewApplicationEmail({
  to,
  candidateName,
  jobTitle,
  dashboardUrl,
}) {
  const url = dashboardUrl || `${env.CLIENT_URL}/recruiter/ats`;
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

async function sendRecruiterJobExpiredEmail({
  to,
  jobTitle,
  companyName,
  expiredAt,
  archivesUrl,
}) {
  const url = archivesUrl || `${env.CLIENT_URL}/recruiter/archives`;
  const subject = `Offre expirée et archivée — ${jobTitle}`;
  const expirationLabel = expiredAt
    ? new Date(expiredAt).toLocaleDateString('fr-FR')
    : 'date d’expiration atteinte';
  const text =
    `Votre offre « ${jobTitle} »${companyName ? ` (${companyName})` : ''} est arrivée à expiration le ${expirationLabel}.\n\n` +
    'Elle a été déplacée automatiquement dans Archives et n’est plus visible par les candidats.\n\n' +
    `Voir les archives : ${url}`;

  const bodyHtml = `
  <p>Votre offre <strong>« ${escapeHtml(jobTitle)} »</strong>${companyName ? ` chez <strong>${escapeHtml(companyName)}</strong>` : ''} est arrivée à expiration le <strong>${escapeHtml(expirationLabel)}</strong>.</p>
  <p>Elle a été déplacée automatiquement dans <strong>Archives</strong> et n’est plus disponible publiquement pour les candidats.</p>
  <p style="margin-top:20px;">${brandButton(url, 'Voir les archives')}</p>`;

  return sendMail({
    to,
    subject,
    text,
    html: wrapEmailHtml({ title: 'Offre expirée', bodyHtml }),
    devLinkLabel: 'Archives recruteur',
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
  sendRecruiterJobExpiredEmail,
  sendProviderParticipationEmail,
  sendContactFormEmail,
};
