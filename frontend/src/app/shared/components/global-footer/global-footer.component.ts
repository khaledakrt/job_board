import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

interface FooterLink {
  labelKey: string;
  route?: string;
  fragment?: string;
}

interface FooterContact {
  email: string;
  roleKey: string;
}

interface FooterSocial {
  label: 'Facebook' | 'LinkedIn';
  href: string;
}

@Component({
  selector: 'app-global-footer',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './global-footer.component.html',
  styleUrl: './global-footer.component.css',
})
export class GlobalFooterComponent {
  readonly year = new Date().getFullYear();
  readonly routes = APP_ROUTES;

  readonly navigationLinks: FooterLink[] = [
    { labelKey: 'public.nav.jobs', route: '/', fragment: 'offres' },
    { labelKey: 'public.nav.candidates', route: '/', fragment: 'candidats' },
    { labelKey: 'public.nav.recruiters', route: '/', fragment: 'recruteurs' },
    { labelKey: 'public.nav.trainingCenters', route: APP_ROUTES.PUBLIC.TRAINING_CENTERS },
    { labelKey: 'public.nav.privateInstitutions', route: APP_ROUTES.PUBLIC.PRIVATE_INSTITUTIONS },
  ];

  readonly infoLinks: FooterLink[] = [
    { labelKey: 'public.nav.contact', route: APP_ROUTES.PUBLIC.CONTACT },
    { labelKey: 'public.nav.about', route: APP_ROUTES.PUBLIC.ABOUT },
    { labelKey: 'public.nav.terms', route: APP_ROUTES.PUBLIC.TERMS },
  ];

  readonly socialLinks: FooterSocial[] = [
    { label: 'Facebook', href: 'https://www.facebook.com/tun.job.board' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/tunisian-job-board/' },
  ];

  readonly contacts: FooterContact[] = [
    {
      email: 'support@tun-job-board.com',
      roleKey: 'footer.contact.support',
    },
    {
      email: 'administration@tun-job-board.com',
      roleKey: 'footer.contact.admin',
    },
    {
      email: 'info@tun-job-board.com',
      roleKey: 'footer.contact.info',
    },
    {
      email: 'contact@tun-job-board.com',
      roleKey: 'footer.contact.partnerships',
    },
  ];
}
