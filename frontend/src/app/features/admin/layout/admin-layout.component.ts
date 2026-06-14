import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher.component';

type AdminNavItem = {
  label: string;
  labelKey: string;
  route: string;
  queryParams?: Record<string, string>;
  exact?: boolean;
  badge?: string;
};

type AdminNavSection = {
  label: string;
  labelKey: string;
  items: AdminNavItem[];
};

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, LanguageSwitcherComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent {
  readonly authService = inject(AuthService);
  readonly routes = APP_ROUTES;
  readonly navSections: AdminNavSection[] = [
    {
      label: 'Pilotage',
      labelKey: 'admin.section.control',
      items: [
        {
          label: 'Vue d’ensemble',
          labelKey: 'admin.nav.overview',
          route: this.routes.ADMIN.DASHBOARD,
          exact: true,
        },
      ],
    },
    {
      label: 'Comptes & accès',
      labelKey: 'admin.section.accounts',
      items: [
        {
          label: 'Candidats',
          labelKey: 'admin.nav.candidates',
          route: this.routes.ADMIN.USERS,
          queryParams: { role: 'candidate' },
        },
        {
          label: 'Recruteurs',
          labelKey: 'admin.nav.recruiters',
          route: this.routes.ADMIN.USERS,
          queryParams: { role: 'recruiter' },
        },
        {
          label: 'Administrateurs',
          labelKey: 'admin.nav.admins',
          route: this.routes.ADMIN.USERS,
          queryParams: { role: 'admin' },
        },
      ],
    },
    {
      label: 'Recrutement',
      labelKey: 'admin.section.recruitment',
      items: [
        {
          label: 'Entreprises & abonnements',
          labelKey: 'admin.nav.companies',
          route: this.routes.ADMIN.COMPANIES,
        },
        { label: 'Offres d’emploi', labelKey: 'admin.nav.jobs', route: this.routes.ADMIN.JOBS },
        {
          label: 'Candidatures',
          labelKey: 'admin.nav.applications',
          route: this.routes.ADMIN.APPLICATIONS,
        },
      ],
    },
    {
      label: 'Catalogue formation',
      labelKey: 'admin.section.trainingCatalog',
      items: [
        {
          label: 'Centres de formation',
          labelKey: 'admin.nav.trainingCenters',
          route: this.routes.ADMIN.TRAINING_CENTERS,
        },
        {
          label: 'Formations',
          labelKey: 'admin.nav.formations',
          route: this.routes.ADMIN.TRAINING_FORMATIONS,
        },
        {
          label: 'Événements',
          labelKey: 'admin.nav.events',
          route: this.routes.ADMIN.TRAINING_EVENTS,
        },
      ],
    },
    {
      label: 'Catalogue établissements',
      labelKey: 'admin.section.institutionCatalog',
      items: [
        {
          label: 'Établissements privés',
          labelKey: 'admin.nav.privateInstitutions',
          route: this.routes.ADMIN.PRIVATE_INSTITUTIONS,
        },
        {
          label: 'Publications à modérer',
          labelKey: 'admin.nav.offeringsModeration',
          route: this.routes.ADMIN.PRIVATE_INSTITUTION_OFFERINGS,
        },
      ],
    },
  ];

  logout(): void {
    this.authService.logout();
  }
}
