import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { USER_ROLES } from './core/constants/roles.constant';
import { HomeComponent } from './features/public/home/home.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: HomeComponent,
  },
  {
    path: 'offres/:id',
    loadComponent: () =>
      import('./features/public/job-page/public-job-page.component').then(
        (m) => m.PublicJobPageComponent
      ),
  },
  {
    path: 'entreprises/:id',
    loadComponent: () =>
      import('./features/public/company-page/public-company-page.component').then(
        (m) => m.PublicCompanyPageComponent
      ),
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/settings-redirect.component').then(
        (m) => m.SettingsRedirectComponent
      ),
  },
  {
    path: 'candidate',
    canActivate: [authGuard, roleGuard([USER_ROLES.CANDIDATE])],
    loadChildren: () =>
      import('./features/candidate/candidate.routes').then((m) => m.CANDIDATE_ROUTES),
  },
  {
    path: 'recruiter',
    canActivate: [authGuard, roleGuard([USER_ROLES.RECRUITER])],
    loadChildren: () =>
      import('./features/recruiter/recruiter.routes').then((m) => m.RECRUITER_ROUTES),
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard([USER_ROLES.ADMIN])],
    loadChildren: () =>
      import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
