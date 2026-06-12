import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { APP_ROUTES } from '../../core/constants/routes.constant';
import { USER_ROLES } from '../../core/constants/roles.constant';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-provider-redirect',
  standalone: true,
  template: '',
})
export class ProviderRedirectComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    const role = this.authService.user()?.role;
    const target =
      role === USER_ROLES.INSTITUTION_PROVIDER
        ? APP_ROUTES.PROVIDER.INSTITUTION
        : APP_ROUTES.PROVIDER.TRAINING;

    void this.router.navigateByUrl(target);
  }
}
