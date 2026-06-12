import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_ROUTES } from '../../../core/constants/routes.constant';

interface FooterLink {
  label: string;
  route?: string;
  fragment?: string;
}

interface FooterContact {
  email: string;
  role: string;
}

interface FooterSocial {
  label: 'Facebook' | 'LinkedIn';
  href: string;
}

@Component({
  selector: 'app-global-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './global-footer.component.html',
  styleUrl: './global-footer.component.css',
})
export class GlobalFooterComponent {
  readonly year = new Date().getFullYear();
  readonly routes = APP_ROUTES;

  readonly navigationLinks: FooterLink[] = [
    { label: 'Offres', route: '/', fragment: 'offres' },
    { label: 'Candidats', route: '/', fragment: 'candidats' },
    { label: 'Recruteurs', route: '/', fragment: 'recruteurs' },
    { label: 'Centres de formation', route: APP_ROUTES.PUBLIC.TRAINING_CENTERS },
    { label: 'Établissements privés', route: APP_ROUTES.PUBLIC.PRIVATE_INSTITUTIONS },
  ];

  readonly infoLinks: FooterLink[] = [
    { label: 'Contact', route: APP_ROUTES.PUBLIC.CONTACT },
    { label: 'Qui sommes-nous', route: APP_ROUTES.PUBLIC.ABOUT },
    { label: 'Termes et conditions', route: APP_ROUTES.PUBLIC.TERMS },
  ];

  readonly socialLinks: FooterSocial[] = [
    { label: 'Facebook', href: 'https://www.facebook.com/tun.job.board' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/tunisian-job-board/' },
  ];

  readonly contacts: FooterContact[] = [
    {
      email: 'support@tun-job-board.com',
      role: 'Assistance technique et aide aux utilisateurs',
    },
    {
      email: 'administration@tun-job-board.com',
      role: 'Requêtes administratives et de gestion',
    },
    {
      email: 'info@tun-job-board.com',
      role: 'Demandes d’informations générales',
    },
    {
      email: 'contact@tun-job-board.com',
      role: 'Prises de contact professionnelles et partenariats',
    },
  ];
}
