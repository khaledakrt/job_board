export const APP_ROUTES = {
  HOME: '/',
  PUBLIC: {
    JOB: (id: string) => `/offres/${id}`,
    COMPANY: (id: string) => `/entreprises/${id}`,
  },
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
  },
  SETTINGS: '/settings',
  CANDIDATE: {
    ROOT: '/candidate',
    DASHBOARD: '/candidate/dashboard',
    JOBS: '/candidate/jobs',
    PROFILE: '/candidate/profile',
    SETTINGS: '/candidate/settings',
  },
  RECRUITER: {
    ROOT: '/recruiter',
    DASHBOARD: '/recruiter/dashboard',
    ONBOARDING: '/recruiter/onboarding',
    TEAM: '/recruiter/team',
    JOBS: '/recruiter/jobs',
    JOBS_NEW: '/recruiter/jobs/new',
    ATS: '/recruiter/ats',
    SETTINGS: '/recruiter/settings',
  },
} as const;
