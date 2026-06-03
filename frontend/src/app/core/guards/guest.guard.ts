import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { APP_ROUTES } from '../constants/routes.constant';
import { USER_ROLES } from '../constants/roles.constant';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  const user = authService.user();

  if (user?.role === USER_ROLES.CANDIDATE) {
    return router.createUrlTree([APP_ROUTES.CANDIDATE.DASHBOARD]);
  }

  if (user?.role === USER_ROLES.RECRUITER) {
    return router.createUrlTree([APP_ROUTES.RECRUITER.DASHBOARD]);
  }

  if (user?.role === USER_ROLES.ADMIN) {
    return router.createUrlTree([APP_ROUTES.ADMIN.DASHBOARD]);
  }

  return router.createUrlTree([APP_ROUTES.HOME]);
};
