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
  password?: string;
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
