'use strict';

const express = require('express');
const authRoutes = require('./auth.routes');
const companiesRoutes = require('./companies.routes');
const recruiterTeamRoutes = require('./recruiterTeam.routes');
const recruiterProfileRoutes = require('./recruiterProfile.routes');
const recruiterJobsRoutes = require('./recruiterJobs.routes');
const recruiterNotificationsRoutes = require('./recruiterNotifications.routes');
const subscriptionPaymentsRoutes = require('./subscriptionPayments.routes');
const publicJobsRoutes = require('./publicJobs.routes');
const applicationsRoutes = require('./applications.routes');
const candidateProfileRoutes = require('./candidateProfile.routes');
const candidateResumeRoutes = require('./candidateResume.routes');
const candidateApplicationsRoutes = require('./candidateApplications.routes');
const candidateSavedJobsRoutes = require('./candidateSavedJobs.routes');
const candidateJobAlertsRoutes = require('./candidateJobAlerts.routes');
const candidateNotificationsRoutes = require('./candidateNotifications.routes');
const protectedUploadsRoutes = require('./protectedUploads.routes');
const adminRoutes = require('./admin.routes');
const publicRoutes = require('./public.routes');
const publicCatalogRoutes = require('./publicCatalog.routes');
const subscriptionWebhooksRoutes = require('./subscriptionWebhooks.routes');
const providerRoutes = require('./provider.routes');
const candidateDashboardRoutes = require('./candidateDashboard.routes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/companies', companiesRoutes);
router.use('/recruiter', recruiterProfileRoutes);
router.use('/recruiter/team', recruiterTeamRoutes);
router.use('/recruiter/jobs', recruiterJobsRoutes);
router.use('/recruiter/notifications', recruiterNotificationsRoutes);
router.use('/recruiter/subscription', subscriptionPaymentsRoutes);
router.use('/jobs', publicJobsRoutes);
router.use('/public', publicRoutes);
router.use('/public', publicCatalogRoutes);
router.use('/subscriptions', subscriptionWebhooksRoutes);
router.use('/provider', providerRoutes);
router.use('/applications', applicationsRoutes);
router.use('/candidate/dashboard', candidateDashboardRoutes);
router.use('/candidate/profile', candidateProfileRoutes);
router.use('/candidate/resume', candidateResumeRoutes);
router.use('/candidate/applications', candidateApplicationsRoutes);
router.use('/candidate/saved-jobs', candidateSavedJobsRoutes);
router.use('/candidate/job-alerts', candidateJobAlertsRoutes);
router.use('/candidate/notifications', candidateNotificationsRoutes);
router.use('/uploads', protectedUploadsRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
