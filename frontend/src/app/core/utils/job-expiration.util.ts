/** Default listing duration in days (must match backend DEFAULT_JOB_EXPIRATION_DAYS). */
export const DEFAULT_JOB_EXPIRATION_DAYS = 60;

export function defaultJobExpiresAtInput(): string {
  const date = new Date();
  date.setDate(date.getDate() + DEFAULT_JOB_EXPIRATION_DAYS);
  return toDateInputValue(date);
}

export function toDateInputValue(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isJobExpiredByDate(expiresAt: string, now = Date.now()): boolean {
  return new Date(expiresAt).getTime() <= now;
}

export function daysUntilExpiration(expiresAt: string, now = Date.now()): number {
  const diff = new Date(expiresAt).getTime() - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
