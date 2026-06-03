import { Job } from '../models/job.model';
import { REMOTE_TYPE_LABELS, RemoteType } from '../constants/job.constant';

export function remoteLabel(remoteType: string | undefined): string {
  if (!remoteType) return '—';
  return REMOTE_TYPE_LABELS[remoteType as RemoteType] ?? remoteType;
}

/** Formats minimum years of experience for display. */
export function experienceDisplayLabel(
  job: Pick<Job, 'experienceYears'>
): string | null {
  const years = job.experienceYears;
  if (years == null) return null;
  if (years === 0) return 'Débutant accepté';
  if (years === 1) return '1 an d\'expérience minimum';
  return `${years} ans d'expérience minimum`;
}

/** Displays recruiter-provided salary text (amount or free wording). */
export function salaryDisplayLabel(job: Pick<Job, 'salaryLabel'>): string | null {
  const label = job.salaryLabel?.trim();
  return label || null;
}

/** @deprecated Use salaryDisplayLabel */
export const salaryRangeLabel = salaryDisplayLabel;
