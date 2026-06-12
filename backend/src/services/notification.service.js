'use strict';

const {
  CandidateNotification,
  CandidateProfile,
  User,
  Job,
  Company,
} = require('../models');
const { generateUuid } = require('../utils/uuid');
const emailAlertService = require('./emailAlert.service');

const STATUS_LABELS = {
  applied: 'Candidature reçue',
  screening: 'En cours d\'examen',
  interview: 'Entretien',
  offer: 'Proposition',
  rejected: 'Mise à jour de candidature',
};

const STATUS_DISPLAY = {
  applied: 'Candidature envoyée',
  screening: 'Présélection',
  interview: 'Entretien',
  offer: 'Offre',
  rejected: 'Refusée',
};

const DEFAULT_NOTIFICATION_PREFERENCES = {
  emailEnabled: true,
  inAppEnabled: true,
  statusChange: true,
  recruiterMessage: true,
  jobAlert: true,
};

function resolveNotificationPreferences(candidate) {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(candidate?.notification_preferences || {}),
  };
}

function preferenceAllowsType(preferences, type) {
  if (!type) return true;
  if (type === 'statusChange') return preferences.statusChange !== false;
  if (type === 'recruiterMessage') return preferences.recruiterMessage !== false;
  if (type === 'jobAlert') return preferences.jobAlert !== false;
  return true;
}

async function createInAppNotification({ candidateId, title, messageText }) {
  return CandidateNotification.create({
    id: generateUuid(),
    candidate_id: candidateId,
    title,
    message_text: messageText,
    is_read: false,
    created_at: new Date(),
  });
}

async function resolveCandidateContact(candidateId) {
  const candidate = await CandidateProfile.findByPk(candidateId, {
    include: [{ model: User, as: 'user', attributes: ['id', 'email'] }],
  });

  if (!candidate || !candidate.user) {
    return null;
  }

  const displayName = [candidate.first_name, candidate.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    candidate,
    email: candidate.user.email,
    displayName: displayName || candidate.user.email,
  };
}

async function notifyCandidate({
  candidateId,
  title,
  messageText,
  companyName,
  jobTitle,
  recruiterEmail,
  recruiterName,
  preferenceType,
}) {
  const contact = await resolveCandidateContact(candidateId);

  if (!contact) {
    return { notification: null, email: { sent: false, reason: 'candidate_not_found' } };
  }

  const preferences = resolveNotificationPreferences(contact.candidate);
  const typeAllowed = preferenceAllowsType(preferences, preferenceType);

  if (!typeAllowed) {
    return {
      notification: null,
      email: { sent: false, reason: `${preferenceType || 'notification'}_disabled` },
    };
  }

  const notification =
    preferences.inAppEnabled === false
      ? null
      : await createInAppNotification({
          candidateId,
          title,
          messageText,
        });

  const emailResult =
    preferences.emailEnabled === false
      ? { sent: false, reason: 'email_disabled' }
      : await emailAlertService.sendCandidateAlertEmail({
          to: contact.email,
          replyTo: recruiterEmail,
          subject: title,
          messageText,
          companyName,
          jobTitle,
          recruiterName,
        });

  return { notification, email: emailResult };
}

async function notifyApplicationStatusChange({
  application,
  previousStatus,
  newStatus,
  evaluationText,
  interviewAt,
  recruiterUser,
}) {
  const job = await Job.findByPk(application.job_id, {
    include: [{ model: Company, as: 'company' }],
  });

  const companyName = job?.company?.name || 'Entreprise';
  const jobTitle = job?.title || 'Poste';
  const statusLabel = STATUS_LABELS[newStatus] || 'Mise à jour';

  const title = `${statusLabel} — ${jobTitle}`;

  let messageText = `Votre candidature pour « ${jobTitle} » chez ${companyName} a été mise à jour.\n\n`;
  messageText += `Ancien statut : ${STATUS_DISPLAY[previousStatus] || previousStatus}\n`;
  messageText += `Nouveau statut : ${STATUS_DISPLAY[newStatus] || newStatus}\n`;

  if (newStatus === 'interview' && interviewAt) {
    messageText += `\nEntretien prévu : ${new Date(interviewAt).toLocaleString('fr-FR')}\n`;
  }

  if (evaluationText) {
    messageText += `\nÉvaluation du recruteur :\n${evaluationText}\n`;
  }

  messageText += '\nConsultez votre tableau de bord candidat pour plus de détails.';

  const recruiterName = recruiterUser.email;

  return notifyCandidate({
    candidateId: application.candidate_id,
    title,
    messageText,
    companyName,
    jobTitle,
    recruiterEmail: recruiterUser.email,
    recruiterName,
    preferenceType: 'statusChange',
  });
}

async function notifyApplicationNote({
  application,
  noteText,
  recruiterUser,
}) {
  const job = await Job.findByPk(application.job_id, {
    include: [{ model: Company, as: 'company' }],
  });

  const companyName = job?.company?.name || 'Entreprise';
  const jobTitle = job?.title || 'Poste';
  const title = `Nouvelle note — ${jobTitle}`;

  const messageText =
    `Mise à jour concernant votre candidature pour « ${jobTitle} » chez ${companyName}.\n\n` +
    `${noteText}\n\n` +
    'Vous pouvez répondre à cet e-mail si vous avez des questions.';

  return notifyCandidate({
    candidateId: application.candidate_id,
    title,
    messageText,
    companyName,
    jobTitle,
    recruiterEmail: recruiterUser.email,
    recruiterName: recruiterUser.email,
    preferenceType: 'recruiterMessage',
  });
}

module.exports = {
  createInAppNotification,
  notifyCandidate,
  notifyApplicationStatusChange,
  notifyApplicationNote,
};
