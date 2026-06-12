'use strict';

const USER_ROLES = Object.freeze({
  CANDIDATE: 'candidate',
  RECRUITER: 'recruiter',
  ADMIN: 'admin',
  TRAINING_PROVIDER: 'training_provider',
  INSTITUTION_PROVIDER: 'institution_provider',
});

const PROVIDER_ROLES = Object.freeze([
  USER_ROLES.TRAINING_PROVIDER,
  USER_ROLES.INSTITUTION_PROVIDER,
]);

const REFRESH_COOKIE_NAME = 'refreshToken';

const BCRYPT_ROUNDS = 12;

const COMPANY_ROLES = Object.freeze({
  OWNER: 'owner',
  RECRUITER: 'recruiter',
});

const RECRUITER_PERMISSIONS = Object.freeze({
  CAN_POST_JOB: 'can_post_job',
  CAN_DECIDE_APPLICATION: 'can_decide_application',
  CAN_EDIT_COMPANY: 'can_edit_company',
});

const JOB_STATUS = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  HIDDEN: 'hidden',
  EXPIRED: 'expired',
});

/** Statuses visible on the public candidate job board */
const JOB_PUBLIC_STATUSES = Object.freeze([JOB_STATUS.ACTIVE]);

const CATALOG_PUBLISH_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING: 'pending',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
});

const CATALOG_PUBLIC_STATUSES = Object.freeze([CATALOG_PUBLISH_STATUS.PUBLISHED]);

const TRAINING_DELIVERY_MODES = Object.freeze(['online', 'onsite', 'hybrid']);

const INSTITUTION_TYPES = Object.freeze([
  'primary',
  'college',
  'high_school',
  'higher_institute',
  'university',
  'academy',
]);

/** Recruiter-selectable statuses (expired is set automatically from expires_at) */
const JOB_MANUAL_STATUSES = Object.freeze([
  JOB_STATUS.DRAFT,
  JOB_STATUS.ACTIVE,
  JOB_STATUS.HIDDEN,
]);

const APPLICATION_STATUS = Object.freeze({
  APPLIED: 'applied',
  SCREENING: 'screening',
  INTERVIEW: 'interview',
  OFFER: 'offer',
  REJECTED: 'rejected',
});

const REMOTE_TYPES = Object.freeze(['on-site', 'hybrid', 'remote']);
const CONTRACT_TYPES = Object.freeze(['CDI', 'CDD', 'Freelance', 'Internship']);

const LOGO_UPLOAD = Object.freeze({
  MAX_FILE_SIZE_BYTES: 2 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  SUBDIRECTORY: 'logos',
});

const RESUME_UPLOAD = Object.freeze({
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ['application/pdf'],
  SUBDIRECTORY: 'resumes',
});

const AVATAR_UPLOAD = Object.freeze({
  MAX_FILE_SIZE_BYTES: 2 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  SUBDIRECTORY: 'avatars',
});

const CV_SNAPSHOT_UPLOAD = Object.freeze({
  SUBDIRECTORY: 'snapshots',
});

const CANDIDATE_LIMITS = Object.freeze({
  MAX_SAVED_JOBS: 10,
  MAX_JOB_ALERTS: 5,
});

const CATALOG_BROCHURE_UPLOAD = Object.freeze({
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ['application/pdf'],
  SUBDIRECTORY: 'brochures',
});

const CATALOG_IMAGE_UPLOAD = Object.freeze({
  MAX_FILE_SIZE_BYTES: 2 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  SUBDIRECTORY: 'catalog-images',
  MAX_GALLERY_FILES: 7,
});

const PARTICIPATION_TYPES = Object.freeze({
  INTERESTED: 'interested',
  REGISTERED: 'registered',
});

const TRAINING_EVENT_TYPES = Object.freeze([
  'workshop',
  'conference',
  'seminar',
  'open_day',
  'webinar',
  'other',
]);

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

module.exports = {
  USER_ROLES,
  PROVIDER_ROLES,
  REFRESH_COOKIE_NAME,
  BCRYPT_ROUNDS,
  COMPANY_ROLES,
  RECRUITER_PERMISSIONS,
  JOB_STATUS,
  JOB_PUBLIC_STATUSES,
  CATALOG_PUBLISH_STATUS,
  CATALOG_PUBLIC_STATUSES,
  TRAINING_DELIVERY_MODES,
  INSTITUTION_TYPES,
  JOB_MANUAL_STATUSES,
  APPLICATION_STATUS,
  REMOTE_TYPES,
  CONTRACT_TYPES,
  LOGO_UPLOAD,
  RESUME_UPLOAD,
  AVATAR_UPLOAD,
  CV_SNAPSHOT_UPLOAD,
  CANDIDATE_LIMITS,
  CATALOG_BROCHURE_UPLOAD,
  CATALOG_IMAGE_UPLOAD,
  PARTICIPATION_TYPES,
  TRAINING_EVENT_TYPES,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};
