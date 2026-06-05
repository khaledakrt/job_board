import { APP_ROUTES } from '../../../core/constants/routes.constant';

export interface PublicNavItem {
  label: string;
  homeFragment?: string;
  route?: string;
}

/** Liens avant Connexion / Inscription */
export const PUBLIC_MAIN_NAV_PRIMARY: PublicNavItem[] = [
  { label: 'Offres', homeFragment: 'offres' },
  { label: 'Candidats', homeFragment: 'candidats' },
  { label: 'Recruteurs', homeFragment: 'recruteurs' },
  { label: 'Fonctionnalités', homeFragment: 'fonctionnalites' },
  { label: 'Centres de formation', route: APP_ROUTES.PUBLIC.TRAINING_CENTERS },
  { label: 'Établissement privé', route: APP_ROUTES.PUBLIC.PRIVATE_INSTITUTIONS },
];

/** Liens après Connexion / Inscription */
export const PUBLIC_MAIN_NAV_SECONDARY: PublicNavItem[] = [
  { label: 'Contact', route: APP_ROUTES.PUBLIC.CONTACT },
  { label: 'Qui sommes-nous', route: APP_ROUTES.PUBLIC.ABOUT },
  { label: 'Termes et conditions', route: APP_ROUTES.PUBLIC.TERMS },
];

export const PUBLIC_MAIN_NAV: PublicNavItem[] = [
  ...PUBLIC_MAIN_NAV_PRIMARY,
  ...PUBLIC_MAIN_NAV_SECONDARY,
];

export const PUBLIC_FOOTER_NAV: PublicNavItem[] = [
  { label: 'Offres', homeFragment: 'offres' },
  { label: 'Candidats', homeFragment: 'candidats' },
  { label: 'Recruteurs', homeFragment: 'recruteurs' },
  { label: 'Fonctionnalités', homeFragment: 'fonctionnalites' },
  { label: 'Centres de formation', route: APP_ROUTES.PUBLIC.TRAINING_CENTERS },
  { label: 'Établissement privé', route: APP_ROUTES.PUBLIC.PRIVATE_INSTITUTIONS },
  { label: 'Formations & écoles', homeFragment: 'formations' },
];

export const PUBLIC_FOOTER_INFO: PublicNavItem[] = [
  { label: 'Contact', route: APP_ROUTES.PUBLIC.CONTACT },
  { label: 'Qui sommes-nous', route: APP_ROUTES.PUBLIC.ABOUT },
  { label: 'Termes et conditions', route: APP_ROUTES.PUBLIC.TERMS },
];

export const PUBLIC_STATIC_PAGES: PublicNavItem[] = [
  { label: 'Contact', route: APP_ROUTES.PUBLIC.CONTACT },
  { label: 'Termes et conditions', route: APP_ROUTES.PUBLIC.TERMS },
  { label: 'Qui sommes-nous', route: APP_ROUTES.PUBLIC.ABOUT },
];

export const PUBLIC_SOCIAL_LINKS = [
  { label: 'Twitter', href: 'https://twitter.com/', icon: 'twitter' },
  { label: 'Facebook', href: 'https://facebook.com/', icon: 'facebook' },
  { label: 'LinkedIn', href: 'https://linkedin.com/', icon: 'linkedin' },
] as const;
