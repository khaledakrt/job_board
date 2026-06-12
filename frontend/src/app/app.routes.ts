import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { USER_ROLES } from './core/constants/roles.constant';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/public/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/public/static-page/public-static-page.component').then(
        (m) => m.PublicStaticPageComponent
      ),
    data: { pageId: 'contact' },
  },
  {
    path: 'conditions',
    loadComponent: () =>
      import('./features/public/static-page/public-static-page.component').then(
        (m) => m.PublicStaticPageComponent
      ),
    data: { pageId: 'terms' },
  },
  {
    path: 'qui-sommes-nous',
    loadComponent: () =>
      import('./features/public/static-page/public-static-page.component').then(
        (m) => m.PublicStaticPageComponent
      ),
    data: { pageId: 'about' },
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
    path: 'centres-formation',
    loadComponent: () =>
      import('./features/public/training-centers/training-centers-list.component').then(
        (m) => m.TrainingCentersListComponent
      ),
  },
  {
    path: 'centres-formation/inscription',
    loadComponent: () =>
      import('./features/provider/provider-register/provider-register.component').then(
        (m) => m.ProviderRegisterComponent
      ),
    data: { providerType: 'training_center' },
  },
  {
    path: 'centres-formation/publier',
    redirectTo: 'centres-formation/inscription',
    pathMatch: 'full',
  },
  {
    path: 'centres-formation/formations/:id',
    loadComponent: () =>
      import('./features/public/training-centers/formation-detail.component').then(
        (m) => m.FormationDetailComponent
      ),
  },
  {
    path: 'centres-formation/evenements/:id',
    loadComponent: () =>
      import('./features/public/training-centers/event-detail.component').then(
        (m) => m.EventDetailComponent
      ),
  },
  {
    path: 'centres-formation/:id',
    loadComponent: () =>
      import('./features/public/training-centers/training-center-detail.component').then(
        (m) => m.TrainingCenterDetailComponent
      ),
  },
  {
    path: 'etablissements-prives',
    loadComponent: () =>
      import('./features/public/private-institutions/private-institutions-list.component').then(
        (m) => m.PrivateInstitutionsListComponent
      ),
  },
  {
    path: 'etablissements-prives/inscription',
    loadComponent: () =>
      import('./features/provider/provider-register/provider-register.component').then(
        (m) => m.ProviderRegisterComponent
      ),
    data: { providerType: 'private_institution' },
  },
  {
    path: 'etablissements-prives/publier',
    redirectTo: 'etablissements-prives/inscription',
    pathMatch: 'full',
  },
  {
    path: 'etablissements-prives/publications/:id',
    loadComponent: () =>
      import('./features/public/private-institutions/institution-offering-detail.component').then(
        (m) => m.InstitutionOfferingDetailComponent
      ),
  },
  {
    path: 'etablissements-prives/:id',
    loadComponent: () =>
      import('./features/public/private-institutions/private-institution-detail.component').then(
        (m) => m.PrivateInstitutionDetailComponent
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
    path: 'provider',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/provider/provider.routes').then((m) => m.PROVIDER_ROUTES),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
