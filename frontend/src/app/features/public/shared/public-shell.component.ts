import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { USER_ROLES } from '../../../core/constants/roles.constant';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher.component';
import {
  PUBLIC_MAIN_NAV_PRIMARY,
  PUBLIC_MAIN_NAV_SECONDARY,
} from './public-nav.constant';

@Component({
  selector: 'app-public-shell',
  standalone: true,
  imports: [RouterLink, TranslatePipe, LanguageSwitcherComponent],
  templateUrl: './public-shell.component.html',
  styleUrl: './public-shell.component.css',
})
export class PublicShellComponent {
  readonly authService = inject(AuthService);
  readonly routes = APP_ROUTES;
  readonly mainNavPrimary = PUBLIC_MAIN_NAV_PRIMARY;
  readonly mainNavSecondary = PUBLIC_MAIN_NAV_SECONDARY;

  readonly workspaceLabel = computed(() => {
    const role = this.authService.user()?.role;
    if (role === USER_ROLES.ADMIN) return 'workspace.admin';
    if (role === USER_ROLES.RECRUITER) return 'workspace.recruiter';
    if (role === USER_ROLES.TRAINING_PROVIDER) return 'workspace.trainingProvider';
    if (role === USER_ROLES.INSTITUTION_PROVIDER) return 'workspace.institutionProvider';
    return 'workspace.default';
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
