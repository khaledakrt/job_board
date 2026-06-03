import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { APP_ROUTES } from '../../core/constants/routes.constant';
import { USER_ROLES } from '../../core/constants/roles.constant';

/** Redirects legacy /settings to role-specific settings inside the workspace shell. */
@Component({
  selector: 'app-settings-redirect',
  standalone: true,
  template: `<p class="table-loading">Redirection...</p>`,
})
export class SettingsRedirectComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    const role = this.authService.user()?.role;
    const target =
      role === USER_ROLES.ADMIN
        ? APP_ROUTES.ADMIN.DASHBOARD
        : role === USER_ROLES.RECRUITER
          ? APP_ROUTES.RECRUITER.SETTINGS
          : APP_ROUTES.CANDIDATE.SETTINGS;
    void this.router.navigateByUrl(target, { replaceUrl: true });
  }
}
