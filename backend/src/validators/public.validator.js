'use strict';

const { z } = require('zod');

const contactFormSchema = z.object({
  name: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères').max(120),
  email: z.string().trim().toLowerCase().email('Adresse e-mail invalide').max(255),
  subject: z.string().trim().min(3, 'Le sujet doit contenir au moins 3 caractères').max(200),
  message: z.string().trim().min(10, 'Le message doit contenir au moins 10 caractères').max(5000),
});

module.exports = {
  contactFormSchema,
};
