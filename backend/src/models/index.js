'use strict';

const User = require('./User');
const Company = require('./Company');
const RecruiterProfile = require('./RecruiterProfile');
const CandidateProfile = require('./CandidateProfile');
const Job = require('./Job');
const Application = require('./Application');
const ApplicationNote = require('./ApplicationNote');
const CandidateNotification = require('./CandidateNotification');
const RecruiterNotification = require('./RecruiterNotification');
const RecruiterNotificationRead = require('./RecruiterNotificationRead');
const Subscription = require('./Subscription');
const SavedJob = require('./SavedJob');
const JobAlert = require('./JobAlert');

User.hasOne(RecruiterProfile, { foreignKey: 'user_id', as: 'recruiterProfile' });
RecruiterProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasOne(CandidateProfile, { foreignKey: 'user_id', as: 'candidateProfile' });
CandidateProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Company.hasMany(RecruiterProfile, { foreignKey: 'company_id', as: 'recruiters' });
RecruiterProfile.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

Company.hasOne(Subscription, { foreignKey: 'company_id', as: 'subscription' });
Subscription.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

Company.hasMany(Job, { foreignKey: 'company_id', as: 'jobs' });
Job.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

RecruiterProfile.hasMany(Job, { foreignKey: 'recruiter_id', as: 'postedJobs' });
Job.belongsTo(RecruiterProfile, { foreignKey: 'recruiter_id', as: 'recruiter' });

Job.hasMany(Application, { foreignKey: 'job_id', as: 'applications' });
Application.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });

CandidateProfile.hasMany(Application, { foreignKey: 'candidate_id', as: 'applications' });
Application.belongsTo(CandidateProfile, { foreignKey: 'candidate_id', as: 'candidate' });

Application.hasMany(ApplicationNote, { foreignKey: 'application_id', as: 'notes' });
ApplicationNote.belongsTo(Application, { foreignKey: 'application_id', as: 'application' });
ApplicationNote.belongsTo(User, { foreignKey: 'author_id', as: 'author' });

CandidateProfile.hasMany(CandidateNotification, {
  foreignKey: 'candidate_id',
  as: 'notifications',
});
CandidateNotification.belongsTo(CandidateProfile, {
  foreignKey: 'candidate_id',
  as: 'candidate',
});

CandidateProfile.hasMany(SavedJob, { foreignKey: 'candidate_id', as: 'savedJobs' });
SavedJob.belongsTo(CandidateProfile, { foreignKey: 'candidate_id', as: 'candidate' });
Job.hasMany(SavedJob, { foreignKey: 'job_id', as: 'savedBy' });
SavedJob.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });

CandidateProfile.hasMany(JobAlert, { foreignKey: 'candidate_id', as: 'jobAlerts' });
JobAlert.belongsTo(CandidateProfile, { foreignKey: 'candidate_id', as: 'candidate' });

Company.hasMany(RecruiterNotification, { foreignKey: 'company_id', as: 'notifications' });
RecruiterNotification.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

RecruiterNotification.hasMany(RecruiterNotificationRead, {
  foreignKey: 'notification_id',
  as: 'reads',
});
RecruiterNotificationRead.belongsTo(RecruiterNotification, {
  foreignKey: 'notification_id',
  as: 'notification',
});
RecruiterProfile.hasMany(RecruiterNotificationRead, {
  foreignKey: 'recruiter_id',
  as: 'notificationReads',
});
RecruiterNotificationRead.belongsTo(RecruiterProfile, {
  foreignKey: 'recruiter_id',
  as: 'recruiter',
});

module.exports = {
  User,
  Company,
  RecruiterProfile,
  CandidateProfile,
  Job,
  Application,
  ApplicationNote,
  CandidateNotification,
  RecruiterNotification,
  RecruiterNotificationRead,
  Subscription,
  SavedJob,
  JobAlert,
};
