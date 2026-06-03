export const JOB_STATUSES = ['draft', 'active', 'hidden', 'expired'] as const;

/** Statuses the recruiter can choose (expired is automatic). */
export const JOB_SELECTABLE_STATUSES = ['draft', 'active', 'hidden'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** Visible on the public candidate job board */
export const JOB_PUBLIC_STATUSES: JobStatus[] = ['active'];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: 'Brouillon',
  active: 'Affichée',
  hidden: 'Cachée',
  expired: 'Expirée',
};

export const JOB_STATUS_HINTS: Record<JobStatus, string> = {
  draft: 'Non publiée — visible uniquement par votre équipe',
  active: 'Visible par les candidats sur la plateforme',
  hidden: 'Masquée des candidats — vous pouvez la réactiver',
  expired: 'Offre clôturée automatiquement à la date d\'expiration',
};

export const REMOTE_TYPES = ['on-site', 'hybrid', 'remote'] as const;
export type RemoteType = (typeof REMOTE_TYPES)[number];

export const CONTRACT_TYPES = ['CDI', 'CDD', 'Freelance', 'Internship'] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const REMOTE_TYPE_LABELS: Record<RemoteType, string> = {
  'on-site': 'Sur site',
  hybrid: 'Hybride',
  remote: 'Télétravail',
};

export function isJobPubliclyVisible(status: JobStatus): boolean {
  return JOB_PUBLIC_STATUSES.includes(status);
}
