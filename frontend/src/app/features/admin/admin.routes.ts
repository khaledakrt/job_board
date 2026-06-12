import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./admin-dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./users-list/users-list.component').then((m) => m.UsersListComponent),
      },
      {
        path: 'users/new',
        loadComponent: () =>
          import('./user-form/user-form.component').then((m) => m.UserFormComponent),
      },
      {
        path: 'users/:id',
        loadComponent: () =>
          import('./user-detail/user-detail.component').then((m) => m.UserDetailComponent),
      },
      {
        path: 'jobs',
        loadComponent: () =>
          import('./jobs-list/jobs-list.component').then((m) => m.JobsListComponent),
      },
      {
        path: 'jobs/:id',
        loadComponent: () =>
          import('./job-detail/job-detail.component').then((m) => m.JobDetailComponent),
      },
      {
        path: 'applications',
        loadComponent: () =>
          import('./applications-list/applications-list.component').then(
            (m) => m.ApplicationsListComponent
          ),
      },
      {
        path: 'applications/:id',
        loadComponent: () =>
          import('./application-detail/application-detail.component').then(
            (m) => m.ApplicationDetailComponent
          ),
      },
      {
        path: 'companies',
        loadComponent: () =>
          import('./companies-list/companies-list.component').then(
            (m) => m.CompaniesListComponent
          ),
      },
      {
        path: 'companies/:id',
        loadComponent: () =>
          import('./company-detail/company-detail.component').then(
            (m) => m.CompanyDetailComponent
          ),
      },
      {
        path: 'training-centers',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./catalog-moderation/admin-catalog-moderation.component').then(
                (m) => m.AdminCatalogModerationComponent
              ),
            data: { kind: 'training-centers' },
          },
          {
            path: 'new',
            loadComponent: () =>
              import('./catalog-moderation/admin-catalog-form.component').then(
                (m) => m.AdminCatalogFormComponent
              ),
            data: { kind: 'training-centers' },
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./catalog-moderation/admin-catalog-detail.component').then(
                (m) => m.AdminCatalogDetailComponent
              ),
            data: { kind: 'training-centers' },
          },
        ],
      },
      {
        path: 'training-formations',
        loadComponent: () =>
          import('./offerings-moderation/admin-offerings-moderation.component').then(
            (m) => m.AdminOfferingsModerationComponent
          ),
        data: { kind: 'formations' },
      },
      {
        path: 'training-events',
        loadComponent: () =>
          import('./offerings-moderation/admin-offerings-moderation.component').then(
            (m) => m.AdminOfferingsModerationComponent
          ),
        data: { kind: 'events' },
      },
      {
        path: 'private-institutions',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./catalog-moderation/admin-catalog-moderation.component').then(
                (m) => m.AdminCatalogModerationComponent
              ),
            data: { kind: 'private-institutions' },
          },
          {
            path: 'new',
            loadComponent: () =>
              import('./catalog-moderation/admin-catalog-form.component').then(
                (m) => m.AdminCatalogFormComponent
              ),
            data: { kind: 'private-institutions' },
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./catalog-moderation/admin-catalog-detail.component').then(
                (m) => m.AdminCatalogDetailComponent
              ),
            data: { kind: 'private-institutions' },
          },
        ],
      },
      {
        path: 'private-institution-offerings',
        loadComponent: () =>
          import('./institution-offerings-moderation/admin-institution-offerings-moderation.component').then(
            (m) => m.AdminInstitutionOfferingsModerationComponent
          ),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
];
