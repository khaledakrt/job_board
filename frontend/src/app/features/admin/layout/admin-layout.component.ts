import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';

type AdminNavItem = {
  label: string;
  route: string;
  queryParams?: Record<string, string>;
  exact?: boolean;
  badge?: string;
};

type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent {
  readonly authService = inject(AuthService);
  readonly routes = APP_ROUTES;
  readonly navSections: AdminNavSection[] = [
    {
      label: 'Pilotage',
      items: [
        {
          label: 'Vue d’ensemble',
          route: this.routes.ADMIN.DASHBOARD,
          exact: true,
        },
      ],
    },
    {
      label: 'Comptes & accès',
      items: [
        { label: 'Candidats', route: this.routes.ADMIN.USERS, queryParams: { role: 'candidate' } },
        { label: 'Recruteurs', route: this.routes.ADMIN.USERS, queryParams: { role: 'recruiter' } },
        { label: 'Administrateurs', route: this.routes.ADMIN.USERS, queryParams: { role: 'admin' } },
      ],
    },
    {
      label: 'Recrutement',
      items: [
        { label: 'Entreprises & abonnements', route: this.routes.ADMIN.COMPANIES },
        { label: 'Offres d’emploi', route: this.routes.ADMIN.JOBS },
        { label: 'Candidatures', route: this.routes.ADMIN.APPLICATIONS },
      ],
    },
    {
      label: 'Catalogue formation',
      items: [
        {
          label: 'Centres de formation',
          route: this.routes.ADMIN.TRAINING_CENTERS,
        },
        {
          label: 'Formations',
          route: this.routes.ADMIN.TRAINING_FORMATIONS,
        },
        {
          label: 'Événements',
          route: this.routes.ADMIN.TRAINING_EVENTS,
        },
      ],
    },
    {
      label: 'Catalogue établissements',
      items: [
        {
          label: 'Établissements privés',
          route: this.routes.ADMIN.PRIVATE_INSTITUTIONS,
        },
        {
          label: 'Publications à modérer',
          route: this.routes.ADMIN.PRIVATE_INSTITUTION_OFFERINGS,
        },
      ],
    },
  ];

  logout(): void {
    this.authService.logout();
  }
}
