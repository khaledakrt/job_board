import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { USER_ROLES } from '../../../core/constants/roles.constant';
import {
  PUBLIC_FOOTER_INFO,
  PUBLIC_FOOTER_NAV,
  PUBLIC_MAIN_NAV,
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
  readonly mainNav = PUBLIC_MAIN_NAV;
  readonly footerNav = PUBLIC_FOOTER_NAV;
  readonly footerInfo = PUBLIC_FOOTER_INFO;
  readonly socialLinks = PUBLIC_SOCIAL_LINKS;

  readonly workspaceLink = computed(() => {
    const role = this.authService.user()?.role;
    if (role === USER_ROLES.ADMIN) {
      return APP_ROUTES.ADMIN.DASHBOARD;
    }
    if (role === USER_ROLES.RECRUITER) {
      return APP_ROUTES.RECRUITER.DASHBOARD;
    }
    return APP_ROUTES.CANDIDATE.DASHBOARD;
  });

  logout(): void {
    this.authService.logout();
  }
}
