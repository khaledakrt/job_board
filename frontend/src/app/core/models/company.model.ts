export interface Company {
  id: string;
  name: string;
  legalName: string | null;
  legalForm: string | null;
  siret: string | null;
  vatNumber: string | null;
  streetAddress: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactEmailPublic?: boolean;
  contactPhonePublic?: boolean;
  logoUrl: string | null;
  website: string | null;
  linkedinUrl: string | null;
  description: string | null;
  industry: string | null;
  scaleSize: string | null;
  foundedYear: number | null;
  createdAt?: string;
}

export interface CompanyFormPayload {
  name: string;
  legalName?: string | null;
  legalForm?: string | null;
  siret?: string | null;
  vatNumber?: string | null;
  streetAddress?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactEmailPublic?: boolean;
  contactPhonePublic?: boolean;
  website?: string | null;
  linkedinUrl?: string | null;
  description?: string | null;
  industry?: string | null;
  scaleSize?: string | null;
  foundedYear?: number | null;
  ownerJobTitle?: string | null;
  ownerPhone?: string | null;
}

export type CreateCompanyPayload = CompanyFormPayload;
export type UpdateCompanyPayload = Partial<CompanyFormPayload>;
