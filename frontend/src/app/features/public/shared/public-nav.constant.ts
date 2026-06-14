import { APP_ROUTES } from '../../../core/constants/routes.constant';

export interface PublicNavItem {
  label: string;
  labelKey: string;
  homeFragment?: string;
  route?: string;
}

/** Liens avant Connexion / Inscription */
export const PUBLIC_MAIN_NAV_PRIMARY: PublicNavItem[] = [
  { label: 'Offres', labelKey: 'public.nav.jobs', homeFragment: 'offres' },
  { label: 'Candidats', labelKey: 'public.nav.candidates', homeFragment: 'candidats' },
  { label: 'Recruteurs', labelKey: 'public.nav.recruiters', homeFragment: 'recruteurs' },
  { label: 'Fonctionnalités', labelKey: 'public.nav.features', homeFragment: 'fonctionnalites' },
  {
    label: 'Centres de formation',
    labelKey: 'public.nav.trainingCenters',
    route: APP_ROUTES.PUBLIC.TRAINING_CENTERS,
  },
  {
    label: 'Établissement privé',
    labelKey: 'public.nav.privateInstitutions',
    route: APP_ROUTES.PUBLIC.PRIVATE_INSTITUTIONS,
  },
];

/** Liens après Connexion / Inscription */
export const PUBLIC_MAIN_NAV_SECONDARY: PublicNavItem[] = [
  { label: 'Contact', labelKey: 'public.nav.contact', route: APP_ROUTES.PUBLIC.CONTACT },
  { label: 'Qui sommes-nous', labelKey: 'public.nav.about', route: APP_ROUTES.PUBLIC.ABOUT },
  {
    label: 'Termes et conditions',
    labelKey: 'public.nav.terms',
    route: APP_ROUTES.PUBLIC.TERMS,
  },
];

export const PUBLIC_MAIN_NAV: PublicNavItem[] = [
  ...PUBLIC_MAIN_NAV_PRIMARY,
  ...PUBLIC_MAIN_NAV_SECONDARY,
];

export const PUBLIC_FOOTER_NAV: PublicNavItem[] = [
  { label: 'Offres', labelKey: 'public.nav.jobs', homeFragment: 'offres' },
  { label: 'Candidats', labelKey: 'public.nav.candidates', homeFragment: 'candidats' },
  { label: 'Recruteurs', labelKey: 'public.nav.recruiters', homeFragment: 'recruteurs' },
  { label: 'Fonctionnalités', labelKey: 'public.nav.features', homeFragment: 'fonctionnalites' },
  {
    label: 'Centres de formation',
    labelKey: 'public.nav.trainingCenters',
    route: APP_ROUTES.PUBLIC.TRAINING_CENTERS,
  },
  {
    label: 'Établissement privé',
    labelKey: 'public.nav.privateInstitutions',
    route: APP_ROUTES.PUBLIC.PRIVATE_INSTITUTIONS,
  },
  { label: 'Formations & écoles', labelKey: 'public.nav.trainingCenters', homeFragment: 'formations' },
];

export const PUBLIC_FOOTER_INFO: PublicNavItem[] = [
  { label: 'Contact', labelKey: 'public.nav.contact', route: APP_ROUTES.PUBLIC.CONTACT },
  { label: 'Qui sommes-nous', labelKey: 'public.nav.about', route: APP_ROUTES.PUBLIC.ABOUT },
  {
    label: 'Termes et conditions',
    labelKey: 'public.nav.terms',
    route: APP_ROUTES.PUBLIC.TERMS,
  },
];

export const PUBLIC_STATIC_PAGES: PublicNavItem[] = [
  { label: 'Contact', labelKey: 'public.nav.contact', route: APP_ROUTES.PUBLIC.CONTACT },
  {
    label: 'Termes et conditions',
    labelKey: 'public.nav.terms',
    route: APP_ROUTES.PUBLIC.TERMS,
  },
  { label: 'Qui sommes-nous', labelKey: 'public.nav.about', route: APP_ROUTES.PUBLIC.ABOUT },
];

export const PUBLIC_SOCIAL_LINKS = [
  { label: 'Facebook', href: 'https://www.facebook.com/tun.job.board', icon: 'facebook' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/tunisian-job-board/', icon: 'linkedin' },
] as const;
