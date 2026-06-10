import { Routes } from '@angular/router';
import { applicationPermissionGuard } from './guards/application-permission.guard';
import { ownerGuard } from './guards/owner.guard';
import { recruiterWorkspaceGuard } from './guards/recruiter-workspace.guard';

export const RECRUITER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/recruiter-layout.component').then((m) => m.RecruiterLayoutComponent),
    children: [
      {
        path: 'dashboard',
        canActivate: [recruiterWorkspaceGuard],
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
        canActivate: [recruiterWorkspaceGuard, ownerGuard],
        loadComponent: () =>
          import('./team-management/team-management.component').then(
            (m) => m.TeamManagementComponent
          ),
      },
      {
        path: 'jobs',
        canActivate: [recruiterWorkspaceGuard],
        loadComponent: () =>
          import('./jobs-list/jobs-list.component').then((m) => m.JobsListComponent),
      },
      {
        path: 'jobs/new',
        canActivate: [recruiterWorkspaceGuard],
        loadComponent: () =>
          import('./job-form/job-form.component').then((m) => m.JobFormComponent),
      },
      {
        path: 'jobs/:id/edit',
        canActivate: [recruiterWorkspaceGuard],
        loadComponent: () =>
          import('./job-form/job-form.component').then((m) => m.JobFormComponent),
      },
      {
        path: 'jobs/:id',
        canActivate: [recruiterWorkspaceGuard],
        loadComponent: () =>
          import('./job-preview/job-preview.component').then((m) => m.JobPreviewComponent),
      },
      {
        path: 'ats',
        canActivate: [recruiterWorkspaceGuard, applicationPermissionGuard],
        loadComponent: () =>
          import('./ats-panel/ats-panel.component').then((m) => m.AtsPanelComponent),
      },
      {
        path: 'settings',
        canActivate: [recruiterWorkspaceGuard],
        loadComponent: () =>
          import('../settings/settings.component').then((m) => m.SettingsComponent),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
];
