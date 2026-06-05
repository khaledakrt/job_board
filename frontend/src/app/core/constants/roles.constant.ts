export const USER_ROLES = {
  CANDIDATE: 'candidate',
  RECRUITER: 'recruiter',
  ADMIN: 'admin',
  TRAINING_PROVIDER: 'training_provider',
  INSTITUTION_PROVIDER: 'institution_provider',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export type RegisterRole = 'candidate' | 'recruiter';

export type ProviderRegisterType = 'training_center' | 'private_institution';
