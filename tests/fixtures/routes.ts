export const PUBLIC_ROUTES = [
  '/',
  '/offres',
  '/centres-formation',
  '/etablissements-prives',
] as const;

export const ROLE_DASHBOARDS = {
  candidate: '/candidate/dashboard',
  recruiter: '/recruiter/dashboard',
  admin: '/admin/dashboard',
} as const;
