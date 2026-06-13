import type { Company } from './company.model';

export interface RecruiterProfile {
  id: string;
  userId: string;
  companyId: string;
  jobTitle: string | null;
  phone: string | null;
  companyRole: 'owner' | 'recruiter';
  canPostJob: boolean;
  canDecideApplication: boolean;
  canEditCompany: boolean;
  publicationAccess?: {
    mode: 'free_all' | 'paid_required';
    companySubscriptionStatus: 'active' | 'canceled' | 'missing';
    companySubscriptionEndsAt: string | null;
    canPublish: boolean;
    reason: 'free_global' | 'company_subscription_active' | 'company_subscription_required';
  };
  company: Company | null;
}

export interface TeamMember {
  id: string;
  userId: string;
  email: string | null;
  jobTitle: string | null;
  phone: string | null;
  companyRole: 'owner' | 'recruiter';
  canPostJob: boolean;
  canDecideApplication: boolean;
  canEditCompany: boolean;
  updatedAt: string;
}

export interface InviteTeamMemberPayload {
  email: string;
  jobTitle?: string | null;
  phone?: string | null;
  canPostJob: boolean;
  canDecideApplication: boolean;
  canEditCompany: boolean;
}

export interface UpdateTeamMemberPayload {
  jobTitle?: string | null;
  phone?: string | null;
  canPostJob?: boolean;
  canDecideApplication?: boolean;
  canEditCompany?: boolean;
}
