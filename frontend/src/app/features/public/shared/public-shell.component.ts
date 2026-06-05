import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { USER_ROLES } from '../../../core/constants/roles.constant';
import {
  PUBLIC_FOOTER_INFO,
  PUBLIC_FOOTER_NAV,
  PUBLIC_MAIN_NAV_PRIMARY,
  PUBLIC_MAIN_NAV_SECONDARY,
  PUBLIC_SOCIAL_LINKS,
} from './public-nav.constant';

@Component({
  selector: 'app-public-shell',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './public-shell.component.html',
  styleUrl: './public-shell.component.css',
})
export class PublicShellComponent {
  readonly authService = inject(AuthService);
  readonly routes = APP_ROUTES;
  readonly year = new Date().getFullYear();
  readonly mainNavPrimary = PUBLIC_MAIN_NAV_PRIMARY;
  readonly mainNavSecondary = PUBLIC_MAIN_NAV_SECONDARY;
  readonly footerNav = PUBLIC_FOOTER_NAV;
  readonly footerInfo = PUBLIC_FOOTER_INFO;
  readonly socialLinks = PUBLIC_SOCIAL_LINKS;

  readonly workspaceLabel = computed(() => {
    const role = this.authService.user()?.role;
    if (role === USER_ROLES.ADMIN) return 'Administration';
    if (role === USER_ROLES.RECRUITER) return 'Espace recruteur';
    if (role === USER_ROLES.TRAINING_PROVIDER) return 'Mon centre';
    if (role === USER_ROLES.INSTITUTION_PROVIDER) return 'Mon établissement';
    return 'Mon espace';
  });

  readonly workspaceLink = computed(() => {
    const role = this.authService.user()?.role;
    if (role === USER_ROLES.ADMIN) {
      return APP_ROUTES.ADMIN.DASHBOARD;
    }
    if (role === USER_ROLES.RECRUITER) {
      return APP_ROUTES.RECRUITER.DASHBOARD;
    }
    if (role === USER_ROLES.TRAINING_PROVIDER) {
      return APP_ROUTES.PROVIDER.TRAINING;
    }
    if (role === USER_ROLES.INSTITUTION_PROVIDER) {
      return APP_ROUTES.PROVIDER.INSTITUTION;
    }
    return APP_ROUTES.CANDIDATE.DASHBOARD;
  });

  logout(): void {
    this.authService.logout();
  }
}
