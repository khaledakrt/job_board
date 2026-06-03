import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { RecruiterContextService } from '../services/recruiter-context.service';

export const ownerGuard: CanActivateFn = () => {
  const context = inject(RecruiterContextService);
  const router = inject(Router);

  const redirectTree = router.createUrlTree([APP_ROUTES.RECRUITER.DASHBOARD]);

  if (context.profile()) {
    return context.isOwner() ? true : redirectTree;
  }

  return context.loadContext().pipe(
    map(() => (context.isOwner() ? true : redirectTree))
  );
};
