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

export interface AdminCompanyListItem {
  id: string;
  name: string;
  legalName: string | null;
  legalForm: string | null;
  industry: string | null;
  city: string | null;
  country: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  logoUrl: string | null;
  scaleSize: string | null;
  foundedYear: number | null;
  jobsCount: number;
  activeJobsCount: number;
  recruitersCount: number;
  applicationsCount: number;
  createdAt: string;
}

export interface AdminApplicationListItem {
  id: string;
  status: string;
  rating: number | null;
  interviewAt: string | null;
  hasResume: boolean;
  hasCoverLetter: boolean;
  hasQuizAnswers: boolean;
  createdAt: string;
  updatedAt: string;
  job: {
    id: string;
    title: string;
    status: string;
    companyId: string;
    companyName: string | null;
  } | null;
  candidate: {
    id: string;
    userId: string;
    name: string | null;
    email: string | null;
    professionalTitle: string | null;
  } | null;
}

export interface AdminApplicationDetail extends AdminApplicationListItem {
  coverLetter: string | null;
  resumeSnapshotUrl: string | null;
  quizAnswers: unknown;
  job: {
    id: string;
    title: string;
    status: string;
    companyId: string;
    companyName: string | null;
    location: string | null;
    contractType: string;
    remoteType: string;
    expiresAt: string | null;
    recruiterEmail: string | null;
  } | null;
  candidate: {
    id: string;
    userId: string;
    name: string | null;
    email: string | null;
    professionalTitle: string | null;
    phone: string | null;
    isVerified: boolean;
    isBanned: boolean;
  } | null;
  notes: {
    id: string;
    text: string;
    authorEmail: string | null;
    createdAt: string;
  }[];
}

export interface AdminCompanyDetail extends AdminCompanyListItem {
  siret: string | null;
  vatNumber: string | null;
  streetAddress: string | null;
  postalCode: string | null;
  contactEmailPublic: boolean;
  contactPhonePublic: boolean;
  linkedinUrl: string | null;
  description: string | null;
  recruiters: {
    id: string;
    userId: string;
    email: string | null;
    jobTitle: string | null;
    companyRole: string | null;
    canPostJob: boolean;
    canDecideApplication: boolean;
    canEditCompany: boolean;
    isVerified: boolean;
    isBanned: boolean;
  }[];
  recentJobs: AdminJobListItem[];
}

export interface AdminJobDetail extends AdminJobListItem {
  description: string;
  requirements: string | null;
  tags: string[];
  languages: string[];
  benefits: string[];
  remoteType: string;
  salaryLabel: string | null;
  experienceYears: number | null;
  quizEnabled: boolean;
  company: {
    id: string;
    name: string;
    industry: string | null;
    website: string | null;
  } | null;
  recruiter: {
    id: string;
    userId: string;
    email: string | null;
    jobTitle: string | null;
  } | null;
  recentApplications: AdminApplicationListItem[];
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
}
