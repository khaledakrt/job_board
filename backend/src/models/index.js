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
const UserLoginEvent = require('./UserLoginEvent');
const AdminAuditLog = require('./AdminAuditLog');
const TrainingCenter = require('./TrainingCenter');
const TrainingCourse = require('./TrainingCourse');
const TrainingFormation = require('./TrainingFormation');
const TrainingEvent = require('./TrainingEvent');
const FormationParticipation = require('./FormationParticipation');
const EventParticipation = require('./EventParticipation');
const PrivateInstitution = require('./PrivateInstitution');
const InstitutionOffering = require('./InstitutionOffering');
const InstitutionParticipation = require('./InstitutionParticipation');

User.hasOne(RecruiterProfile, { foreignKey: 'user_id', as: 'recruiterProfile' });
RecruiterProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasOne(CandidateProfile, { foreignKey: 'user_id', as: 'candidateProfile' });
CandidateProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(UserLoginEvent, { foreignKey: 'user_id', as: 'loginEvents' });
UserLoginEvent.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(AdminAuditLog, { foreignKey: 'actor_id', as: 'adminAuditLogs' });
AdminAuditLog.belongsTo(User, { foreignKey: 'actor_id', as: 'actor' });

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

User.hasOne(TrainingCenter, { foreignKey: 'user_id', as: 'trainingCenter' });
TrainingCenter.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });

User.hasOne(PrivateInstitution, { foreignKey: 'user_id', as: 'privateInstitution' });
PrivateInstitution.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });

TrainingCenter.hasMany(TrainingCourse, { foreignKey: 'center_id', as: 'courses' });
TrainingCourse.belongsTo(TrainingCenter, { foreignKey: 'center_id', as: 'center' });

TrainingCenter.hasMany(TrainingFormation, { foreignKey: 'center_id', as: 'formations' });
TrainingFormation.belongsTo(TrainingCenter, { foreignKey: 'center_id', as: 'center' });

TrainingCenter.hasMany(TrainingEvent, { foreignKey: 'center_id', as: 'events' });
TrainingEvent.belongsTo(TrainingCenter, { foreignKey: 'center_id', as: 'center' });

TrainingFormation.hasMany(FormationParticipation, {
  foreignKey: 'formation_id',
  as: 'participations',
});
FormationParticipation.belongsTo(TrainingFormation, {
  foreignKey: 'formation_id',
  as: 'formation',
});
FormationParticipation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(FormationParticipation, { foreignKey: 'user_id', as: 'formationParticipations' });

TrainingEvent.hasMany(EventParticipation, { foreignKey: 'event_id', as: 'participations' });
EventParticipation.belongsTo(TrainingEvent, { foreignKey: 'event_id', as: 'event' });
EventParticipation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(EventParticipation, { foreignKey: 'user_id', as: 'eventParticipations' });

PrivateInstitution.hasMany(InstitutionOffering, {
  foreignKey: 'institution_id',
  as: 'offerings',
});
InstitutionOffering.belongsTo(PrivateInstitution, {
  foreignKey: 'institution_id',
  as: 'institution',
});
InstitutionOffering.hasMany(InstitutionParticipation, {
  foreignKey: 'offering_id',
  as: 'participations',
});
InstitutionParticipation.belongsTo(InstitutionOffering, {
  foreignKey: 'offering_id',
  as: 'offering',
});
InstitutionParticipation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(InstitutionParticipation, {
  foreignKey: 'user_id',
  as: 'institutionParticipations',
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
  UserLoginEvent,
  AdminAuditLog,
  TrainingCenter,
  TrainingCourse,
  TrainingFormation,
  TrainingEvent,
  FormationParticipation,
  EventParticipation,
  PrivateInstitution,
  InstitutionOffering,
  InstitutionParticipation,
};
