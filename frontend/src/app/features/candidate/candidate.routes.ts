import { Routes } from '@angular/router';

export const CANDIDATE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/candidate-layout.component').then((m) => m.CandidateLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./tracking-dashboard/tracking-dashboard.component').then(
            (m) => m.TrackingDashboardComponent
          ),
      },
      {
        path: 'jobs',
        loadComponent: () =>
          import('./job-search/job-search.component').then((m) => m.JobSearchComponent),
      },
      {
        path: 'saved',
        loadComponent: () =>
          import('./saved-jobs/saved-jobs-page.component').then((m) => m.SavedJobsPageComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./profile-stepper/profile-stepper.component').then(
            (m) => m.ProfileStepperComponent
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('../settings/settings.component').then((m) => m.SettingsComponent),
      },
      {
        path: 'annuaire-societes',
        loadComponent: () =>
          import('./directory/candidate-directory.component').then(
            (m) => m.CandidateDirectoryComponent
          ),
        data: { directory: 'companies' },
      },
      {
        path: 'annuaire-formations',
        loadComponent: () =>
          import('./directory/candidate-directory.component').then(
            (m) => m.CandidateDirectoryComponent
          ),
        data: { directory: 'training' },
      },
      {
        path: 'annuaire-etablissements',
        loadComponent: () =>
          import('./directory/candidate-directory.component').then(
            (m) => m.CandidateDirectoryComponent
          ),
        data: { directory: 'institutions' },
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
];
