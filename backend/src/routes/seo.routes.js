'use strict';

const express = require('express');
const seoController = require('../controllers/seo.controller');

const router = express.Router();

router.get('/offres/:id([0-9a-fA-F-]{36})', seoController.renderPublicJob);

module.exports = router;
