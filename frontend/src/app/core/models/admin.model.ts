import { UserRole } from '../constants/roles.constant';
import { InstitutionOfferingItem, InstitutionType, TrainingDeliveryMode } from './catalog.model';
import { PaginationMeta } from './pagination.model';

export interface AdminStats {
  usersTotal: number;
  candidates: number;
  recruiters: number;
  admins: number;
  bannedUsers: number;
  jobsTotal: number;
  applicationsTotal: number;
  companiesTotal: number;
  trainingCentersTotal: number;
  trainingCentersPending: number;
  privateInstitutionsTotal: number;
  privateInstitutionsPending: number;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  isBanned: boolean;
  banReason: string | null;
  bannedAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
  candidateProfile: { id: string; firstName: string; lastName: string } | null;
  recruiterProfile: { id: string; companyName?: string } | null;
}

export interface AdminUserDetail extends AdminUserListItem {
  candidateProfile: {
    id: string;
    firstName: string;
    lastName: string;
    professionalTitle?: string;
    phone?: string;
  } | null;
  recruiterProfile: {
    id: string;
    jobTitle?: string;
    companyId?: string;
    companyName?: string;
  } | null;
}

export interface LoginEvent {
  id: string;
  ipAddress: string;
  userAgent: string | null;
  createdAt: string;
}

export interface AdminJobListItem {
  id: string;
  title: string;
  status: string;
  companyId: string;
  companyName?: string;
  location: string | null;
  contractType: string;
  viewsCount: number;
  applicationsCount: number;
  createdAt: string;
  expiresAt: string | null;
}

export interface CreateAdminUserRequest {
  email: string;
  password: string;
  role: UserRole;
  isVerified?: boolean;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  jobTitle?: string;
}

export interface UpdateAdminUserRequest {
  email?: string;
  role?: UserRole;
  isVerified?: boolean;
  firstName?: string;
  lastName?: string;
}

export type AdminPaginated<T> = { data: T; pagination: PaginationMeta };

export type CatalogPublishStatus = 'pending' | 'published' | 'rejected';

export interface AdminCatalogListItem {
  id: string;
  name: string;
  city: string | null;
  phone: string | null;
  email: string | null;
  trainingDomain?: string | null;
  institutionType?: InstitutionType;
  status: CatalogPublishStatus;
  ownerEmail: string | null;
  createdAt: string;
}

export interface AdminCatalogDetail {
  id: string;
  name: string;
  status: CatalogPublishStatus;
  ownerEmail: string | null;
  ownerId: string | null;
  ownerVerified: boolean | null;
  createdAt: string;
  updatedAt: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  logoUrl: string | null;
  trainingDomain?: string | null;
  deliveryMode?: TrainingDeliveryMode | null;
  institutionType?: InstitutionType;
  mapUrl?: string | null;
  brochures?: string[];
  courses?: { id: string; title: string; description?: string | null; status?: string }[];
  programs?: { title: string; description?: string | null }[];
  institutionOfferings?: InstitutionOfferingItem[];
  publishedPrograms?: InstitutionOfferingItem[];
  publishedEvents?: InstitutionOfferingItem[];
  publishedAnnouncements?: InstitutionOfferingItem[];
  publishedOpportunities?: InstitutionOfferingItem[];
}
