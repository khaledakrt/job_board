import { Job } from './job.model';

export interface PublicCompanyProfile {
  id: string;
  name: string;
  logoUrl: string | null;
  website: string | null;
  linkedinUrl: string | null;
  description: string | null;
  industry: string | null;
  scaleSize: string | null;
  foundedYear: number | null;
  city: string | null;
  country: string | null;
  locationLabel: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

export interface PublicCompanyPageData {
  company: PublicCompanyProfile;
  jobs: Job[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}
