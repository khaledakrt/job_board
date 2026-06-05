import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { RecruiterContextService } from '../services/recruiter-context.service';

export const recruiterWorkspaceGuard: CanActivateFn = () => {
  const context = inject(RecruiterContextService);
  const router = inject(Router);
  const redirectTree = router.createUrlTree([APP_ROUTES.RECRUITER.ONBOARDING]);

  if (context.profile()) {
    return true;
  }

  return context.loadContext().pipe(
    map((response) => (response.data ? true : redirectTree))
  );
};
