'use strict';

const express = require('express');
const authenticate = require('../middleware/authenticate');
const protectedUploadController = require('../controllers/protectedUpload.controller');

const router = express.Router();

router.use(authenticate);

router.get('/resumes/:filename', protectedUploadController.serveResume);
router.get('/snapshots/:filename', protectedUploadController.serveSnapshot);

module.exports = router;
