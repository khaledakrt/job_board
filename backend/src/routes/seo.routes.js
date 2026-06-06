'use strict';

const express = require('express');
const seoController = require('../controllers/seo.controller');

const router = express.Router();

router.get('/', seoController.renderHome);
router.get('/offres/:id([0-9a-fA-F-]{36})', seoController.renderPublicJob);
router.get('/entreprises/:id([0-9a-fA-F-]{36})', seoController.renderPublicCompany);
router.get('/centres-formation', seoController.renderTrainingCentersList);
router.get(
  '/centres-formation/formations/:id([0-9a-fA-F-]{36})',
  seoController.renderFormation
);
router.get(
  '/centres-formation/evenements/:id([0-9a-fA-F-]{36})',
  seoController.renderTrainingEvent
);
router.get('/centres-formation/:id([0-9a-fA-F-]{36})', seoController.renderTrainingCenter);
router.get('/etablissements-prives', seoController.renderPrivateInstitutionsList);
router.get(
  '/etablissements-prives/publications/:id([0-9a-fA-F-]{36})',
  seoController.renderInstitutionOffering
);
router.get(
  '/etablissements-prives/:id([0-9a-fA-F-]{36})',
  seoController.renderPrivateInstitution
);

module.exports = router;
