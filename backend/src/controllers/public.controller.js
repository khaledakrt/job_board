'use strict';

const contactService = require('../services/contact.service');
const asyncHandler = require('../utils/asyncHandler');

const submitContact = asyncHandler(async (req, res) => {
  const result = await contactService.submitContactForm(req.validatedBody);

  res.status(200).json({
    success: true,
    message: result.message,
    data: { sent: result.sent },
  });
});

module.exports = {
  submitContact,
};
