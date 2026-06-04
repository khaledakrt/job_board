import { APP_ROUTES } from '../../../core/constants/routes.constant';

export interface PublicNavItem {
  label: string;
  homeFragment?: string;
  route?: string;
}

export const PUBLIC_MAIN_NAV: PublicNavItem[] = [
  { label: 'Candidats', homeFragment: 'candidats' },
  { label: 'Recruteurs', homeFragment: 'recruteurs' },
  { label: 'Offres', homeFragment: 'offres' },
  { label: 'Fonctionnalités', homeFragment: 'fonctionnalites' },
  { label: 'Contact', route: APP_ROUTES.PUBLIC.CONTACT },
  { label: 'Termes et conditions', route: APP_ROUTES.PUBLIC.TERMS },
  { label: 'Qui sommes-nous', route: APP_ROUTES.PUBLIC.ABOUT },
];

export const PUBLIC_FOOTER_NAV: PublicNavItem[] = [
  { label: 'Candidats', homeFragment: 'candidats' },
  { label: 'Recruteurs', homeFragment: 'recruteurs' },
  { label: 'Offres', homeFragment: 'offres' },
  { label: 'Fonctionnalités', homeFragment: 'fonctionnalites' },
];

export const PUBLIC_FOOTER_INFO: PublicNavItem[] = [
  { label: 'Contact', route: APP_ROUTES.PUBLIC.CONTACT },
  { label: 'Termes et conditions', route: APP_ROUTES.PUBLIC.TERMS },
  { label: 'Qui sommes-nous', route: APP_ROUTES.PUBLIC.ABOUT },
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
