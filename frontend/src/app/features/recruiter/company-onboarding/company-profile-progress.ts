import { Company } from '../../../core/models/company.model';

const URL_PATTERN = /^https?:\/\/.+/i;
const SIRET_PATTERN = /^\d{14}$/;

export interface ProfileProgressField {
  id: string;
  label: string;
  weight: number;
}

export const PROFILE_PROGRESS_FIELDS: ProfileProgressField[] = [
  { id: 'name', label: 'Nom commercial', weight: 12 },
  { id: 'legalName', label: 'Raison sociale', weight: 4 },
  { id: 'legalForm', label: 'Forme juridique', weight: 4 },
  { id: 'siret', label: 'SIRET', weight: 6 },
  { id: 'vatNumber', label: 'N° TVA', weight: 3 },
  { id: 'logo', label: 'Logo', weight: 10 },
  { id: 'streetAddress', label: 'Adresse', weight: 5 },
  { id: 'postalCode', label: 'Code postal', weight: 4 },
  { id: 'city', label: 'Ville', weight: 8 },
  { id: 'country', label: 'Pays', weight: 6 },
  { id: 'contactEmail', label: 'E-mail RH', weight: 10 },
  { id: 'contactPhone', label: 'Téléphone', weight: 5 },
  { id: 'website', label: 'Site web', weight: 6 },
  { id: 'linkedinUrl', label: 'LinkedIn', weight: 4 },
  { id: 'industry', label: 'Secteur', weight: 8 },
  { id: 'scaleSize', label: 'Effectif', weight: 8 },
  { id: 'foundedYear', label: 'Année de création', weight: 3 },
  { id: 'description', label: 'Présentation', weight: 12 },
  { id: 'ownerJobTitle', label: 'Votre poste', weight: 4 },
  { id: 'ownerPhone', label: 'Votre téléphone', weight: 3 },
];

export interface FormProgressInput {
  name: string;
  legalName: string;
  legalForm: string;
  siret: string;
  vatNumber: string;
  streetAddress: string;
  postalCode: string;
  city: string;
  country: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  linkedinUrl: string;
  industry: string;
  scaleSize: string;
  foundedYear: string | number;
  description: string;
  ownerJobTitle: string;
  ownerPhone: string;
  hasLogo: boolean;
  includeOwnerFields: boolean;
}

export interface ProfileProgressResult {
  percent: number;
  filledWeight: number;
  totalWeight: number;
  missing: string[];
  isComplete: boolean;
}

function isFilled(value: string | number | null | undefined, minLen = 1): boolean {
  if (value === null || value === undefined) return false;
  return String(value).trim().length >= minLen;
}

function fieldFilled(id: string, form: FormProgressInput): boolean {
  switch (id) {
    case 'name':
      return isFilled(form.name, 2);
    case 'legalName':
      return isFilled(form.legalName);
    case 'legalForm':
      return isFilled(form.legalForm);
    case 'siret': {
      const s = form.siret.replace(/\s/g, '');
      return s.length > 0 && SIRET_PATTERN.test(s);
    }
    case 'vatNumber':
      return isFilled(form.vatNumber);
    case 'logo':
      return form.hasLogo;
    case 'streetAddress':
      return isFilled(form.streetAddress);
    case 'postalCode':
      return isFilled(form.postalCode);
    case 'city':
      return isFilled(form.city);
    case 'country':
      return isFilled(form.country);
    case 'contactEmail':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim());
    case 'contactPhone':
      return isFilled(form.contactPhone, 6);
    case 'website':
      return isFilled(form.website) && URL_PATTERN.test(form.website.trim());
    case 'linkedinUrl':
      return isFilled(form.linkedinUrl) && URL_PATTERN.test(form.linkedinUrl.trim());
    case 'industry':
      return isFilled(form.industry);
    case 'scaleSize':
      return isFilled(form.scaleSize);
    case 'foundedYear': {
      const y = Number(form.foundedYear);
      return Number.isFinite(y) && y >= 1800 && y <= new Date().getFullYear();
    }
    case 'description':
      return isFilled(form.description, 40);
    case 'ownerJobTitle':
      return isFilled(form.ownerJobTitle);
    case 'ownerPhone':
      return isFilled(form.ownerPhone, 6);
    default:
      return false;
  }
}

export function computeProfileProgress(form: FormProgressInput): ProfileProgressResult {
  const fields = PROFILE_PROGRESS_FIELDS.filter(
    (f) =>
      form.includeOwnerFields || (f.id !== 'ownerJobTitle' && f.id !== 'ownerPhone')
  );

  const totalWeight = fields.reduce((sum, f) => sum + f.weight, 0);
  const missing: string[] = [];
  let filledWeight = 0;

  for (const field of fields) {
    if (fieldFilled(field.id, form)) {
      filledWeight += field.weight;
    } else {
      missing.push(field.label);
    }
  }

  const percent = totalWeight > 0 ? Math.round((filledWeight / totalWeight) * 100) : 0;

  return {
    percent,
    filledWeight,
    totalWeight,
    missing,
    isComplete: percent >= 100,
  };
}

export function formProgressFromCompany(
  company: Company | null,
  overrides: Partial<FormProgressInput>,
  hasLogo: boolean,
  includeOwnerFields: boolean
): FormProgressInput {
  return {
    name: company?.name ?? '',
    legalName: company?.legalName ?? '',
    legalForm: company?.legalForm ?? '',
    siret: company?.siret ?? '',
    vatNumber: company?.vatNumber ?? '',
    streetAddress: company?.streetAddress ?? '',
    postalCode: company?.postalCode ?? '',
    city: company?.city ?? '',
    country: company?.country ?? 'France',
    contactEmail: company?.contactEmail ?? '',
    contactPhone: company?.contactPhone ?? '',
    website: company?.website ?? '',
    linkedinUrl: company?.linkedinUrl ?? '',
    industry: company?.industry ?? '',
    scaleSize: company?.scaleSize ?? '',
    foundedYear: company?.foundedYear ? String(company.foundedYear) : '',
    description: company?.description ?? '',
    ownerJobTitle: '',
    ownerPhone: '',
    hasLogo,
    includeOwnerFields,
    ...overrides,
  };
}
