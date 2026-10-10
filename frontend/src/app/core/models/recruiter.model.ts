import type { Company } from './company.model';

export interface RecruiterProfile {
  id: string;
  userId: string;
  companyId: string;
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  phone: string | null;
  companyRole: 'owner' | 'recruiter';
  canPostJob: boolean;
  canDecideApplication: boolean;
  canEditCompany: boolean;
  publicationAccess?: {
    mode: 'free_all' | 'paid_required';
    override?: 'inherit' | 'free' | 'required';
    companySubscriptionStatus: 'active' | 'canceled' | 'missing';
    companySubscriptionEndsAt: string | null;
    canPublish: boolean;
    reason: 'free_global' | 'user_free' | 'company_subscription_active' | 'company_subscription_required';
  };
  company: Company | null;
}

export interface TeamMember {
  id: string;
  userId: string;
  email: string | null;
  isBanned: boolean;
  firstName: string | null;
  lastName: string | null;
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
  firstName?: string | null;
  lastName?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  canPostJob?: boolean;
  canDecideApplication?: boolean;
  canEditCompany?: boolean;
  companyRole?: 'owner' | 'recruiter';
}

export interface UpdateOwnProfilePayload {
  firstName?: string | null;
  lastName?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
}
