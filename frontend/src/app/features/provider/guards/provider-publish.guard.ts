import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { USER_ROLES } from '../../../core/constants/roles.constant';
import { AuthService } from '../../../core/services/auth.service';
import { ProviderService } from '../services/provider.service';

export const providerPublishGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const providerService = inject(ProviderService);
  const router = inject(Router);
  const role = authService.user()?.role;
  const dashboardUrl =
    role === USER_ROLES.TRAINING_PROVIDER
      ? APP_ROUTES.PROVIDER.TRAINING_DASHBOARD
      : APP_ROUTES.PROVIDER.INSTITUTION_DASHBOARD;
  const redirectTree = router.createUrlTree([dashboardUrl]);
  const request =
    role === USER_ROLES.TRAINING_PROVIDER
      ? providerService.trainingDashboard()
      : providerService.institutionDashboard();

  return request.pipe(
    map((res) => (res.data?.canPublishOfferings ? true : redirectTree)),
    catchError(() => of(redirectTree))
  );
};
