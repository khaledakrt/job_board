import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { APP_ROUTES } from '../constants/routes.constant';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isInitialized()) {
    authService.hydrateFromStorage();
  }

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree([APP_ROUTES.AUTH.LOGIN]);
};
