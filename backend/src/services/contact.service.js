'use strict';

const { env } = require('../config');
const emailService = require('./email.service');

async function submitContactForm({ name, email, subject, message }) {
  const result = await emailService.sendContactFormEmail({
    to: env.CONTACT_TO_EMAIL,
    name,
    email,
    subject,
    message,
  });

  return {
    sent: result.sent,
    message: result.sent
      ? 'Votre message a été envoyé. Nous vous répondrons dès que possible.'
      : 'Votre message a été enregistré. L’envoi par e-mail n’est pas disponible pour le moment ; réessayez plus tard ou contactez-nous directement.',
  };
}

module.exports = {
  submitContactForm,
};
