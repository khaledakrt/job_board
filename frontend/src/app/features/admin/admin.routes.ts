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
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
];
