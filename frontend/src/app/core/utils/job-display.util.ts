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

const SALARY_PERIOD_LABELS: Record<string, string> = {
  month: 'mois',
  year: 'an',
  day: 'jour',
  hour: 'heure',
};

/** Displays structured salary first, then recruiter-provided free text. */
export function salaryDisplayLabel(
  job: Pick<Job, 'salaryLabel' | 'salaryMin' | 'salaryMax' | 'salaryCurrency' | 'salaryPeriod'>
): string | null {
  const label = job.salaryLabel?.trim();
  if (label) return label;

  const min = job.salaryMin;
  const max = job.salaryMax;
  if (min == null && max == null) return null;

  const currency = job.salaryCurrency || 'TND';
  const period = job.salaryPeriod ? ` / ${SALARY_PERIOD_LABELS[job.salaryPeriod] ?? job.salaryPeriod}` : '';
  const format = (value: number) => new Intl.NumberFormat('fr-FR').format(value);

  if (min != null && max != null && min !== max) {
    return `${format(min)} - ${format(max)} ${currency}${period}`;
  }

  return `${format(max ?? min ?? 0)} ${currency}${period}`;
}

/** @deprecated Use salaryDisplayLabel */
export const salaryRangeLabel = salaryDisplayLabel;
