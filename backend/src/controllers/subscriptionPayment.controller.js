'use strict';

const asyncHandler = require('../utils/asyncHandler');
const subscriptionPaymentService = require('../services/subscriptionPayment.service');

const getOverview = asyncHandler(async (req, res) => {
  const data = await subscriptionPaymentService.getRecruiterSubscriptionOverview(req.user.id);
  res.status(200).json({ success: true, data });
});

const createPaymentRequest = asyncHandler(async (req, res) => {
  const data = await subscriptionPaymentService.createRecruiterPaymentRequest(
    req.user.id,
    req.validatedBody
  );
  res.status(201).json({ success: true, message: 'Payment request created', data });
});

const adminListPaymentRequests = asyncHandler(async (req, res) => {
  const data = await subscriptionPaymentService.adminListPaymentRequests(req.validatedQuery || {});
  res.status(200).json({ success: true, data });
});

const adminReviewPaymentRequest = asyncHandler(async (req, res) => {
  const { action, adminNote } = req.validatedBody;
  const data =
    action === 'approve'
      ? await subscriptionPaymentService.approvePaymentRequest(req.validatedParams.id, {
          adminId: req.user.id,
          adminNote,
        })
      : await subscriptionPaymentService.rejectPaymentRequest(req.validatedParams.id, {
          adminId: req.user.id,
          adminNote,
        });

  res.status(200).json({ success: true, message: 'Payment request reviewed', data });
});

const handleKonnectWebhook = asyncHandler(async (req, res) => {
  const data = await subscriptionPaymentService.handleKonnectWebhook(req.query.payment_ref);
  res.status(200).json({ success: true, data });
});

module.exports = {
  getOverview,
  createPaymentRequest,
  adminListPaymentRequests,
  adminReviewPaymentRequest,
  handleKonnectWebhook,
};
