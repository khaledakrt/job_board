'use strict';

const express = require('express');
const controller = require('../controllers/subscriptionPayment.controller');

const router = express.Router();

router.get('/payments/konnect/webhook', controller.handleKonnectWebhook);

module.exports = router;
