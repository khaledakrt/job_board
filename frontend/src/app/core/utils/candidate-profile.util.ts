import { CandidateProfile } from '../models/candidate-profile.model';

export function computeProfileCompletion(profile: CandidateProfile | null): number {
  if (!profile) return 0;

  const checks = [
    Boolean(profile.firstName?.trim()),
    Boolean(profile.lastName?.trim()),
    Boolean(profile.professionalTitle?.trim()),
    Boolean(profile.phone?.trim()),
    Boolean(profile.bio?.trim()),
    Boolean(profile.resumeUrl),
    Boolean(profile.avatarUrl),
    (profile.skills?.length ?? 0) > 0,
    (profile.experiences?.length ?? 0) > 0,
    (profile.education?.length ?? 0) > 0,
  ];

  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

export function profileNeedsAttention(profile: CandidateProfile | null): boolean {
  if (!profile) return true;
  return !profile.resumeUrl || computeProfileCompletion(profile) < 70;
}
