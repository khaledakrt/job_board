import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { RecruiterContextService } from '../services/recruiter-context.service';

export const applicationPermissionGuard: CanActivateFn = () => {
  const context = inject(RecruiterContextService);
  const router = inject(Router);
  const redirectTree = router.createUrlTree([APP_ROUTES.RECRUITER.DASHBOARD]);

  if (context.profile()) {
    return context.canDecideApplication() ? true : redirectTree;
  }

  return context.loadContext().pipe(
    map(() => (context.canDecideApplication() ? true : redirectTree))
  );
};
