import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { APP_ROUTES } from '../constants/routes.constant';
import { UserRole } from '../constants/roles.constant';
import { AuthService } from '../services/auth.service';

export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => {
  return (_route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree([APP_ROUTES.AUTH.LOGIN], {
        queryParams: { returnUrl: state.url },
      });
    }

    const user = authService.user();

    if (user && allowedRoles.includes(user.role)) {
      return true;
    }

    return router.createUrlTree([APP_ROUTES.HOME]);
  };
};
