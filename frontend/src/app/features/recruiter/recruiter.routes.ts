import { Routes } from '@angular/router';
import { ownerGuard } from './guards/owner.guard';

export const RECRUITER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/recruiter-layout.component').then((m) => m.RecruiterLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./recruiter-dashboard/recruiter-dashboard.component').then(
            (m) => m.RecruiterDashboardComponent
          ),
      },
      {
        path: 'onboarding',
        loadComponent: () =>
          import('./company-onboarding/company-onboarding.component').then(
            (m) => m.CompanyOnboardingComponent
          ),
      },
      {
        path: 'team',
        canActivate: [ownerGuard],
        loadComponent: () =>
          import('./team-management/team-management.component').then(
            (m) => m.TeamManagementComponent
          ),
      },
      {
        path: 'jobs',
        loadComponent: () =>
          import('./jobs-list/jobs-list.component').then((m) => m.JobsListComponent),
      },
      {
        path: 'jobs/new',
        loadComponent: () =>
          import('./job-form/job-form.component').then((m) => m.JobFormComponent),
      },
      {
        path: 'jobs/:id/edit',
        loadComponent: () =>
          import('./job-form/job-form.component').then((m) => m.JobFormComponent),
      },
      {
        path: 'jobs/:id',
        loadComponent: () =>
          import('./job-preview/job-preview.component').then((m) => m.JobPreviewComponent),
      },
      {
        path: 'ats',
        loadComponent: () =>
          import('./ats-panel/ats-panel.component').then((m) => m.AtsPanelComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('../settings/settings.component').then((m) => m.SettingsComponent),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
];
