export const APPLICATION_STATUSES = [
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: 'Candidature envoyée',
  screening: 'Présélection',
  interview: 'Entretien',
  offer: 'Offre',
  rejected: 'Refusée',
};
