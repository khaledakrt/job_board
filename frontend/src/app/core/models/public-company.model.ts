import { Job } from './job.model';

export interface PublicCompanyProfile {
  id: string;
  name: string;
  legalName: string | null;
  legalForm: string | null;
  siret: string | null;
  vatNumber: string | null;
  logoUrl: string | null;
  website: string | null;
  linkedinUrl: string | null;
  description: string | null;
  industry: string | null;
  scaleSize: string | null;
  foundedYear: number | null;
  streetAddress: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  locationLabel: string | null;
  addressLabel: string | null;
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
