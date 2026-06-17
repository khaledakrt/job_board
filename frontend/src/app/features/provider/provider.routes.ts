import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role.guard';

import { USER_ROLES } from '../../core/constants/roles.constant';
import { providerPublishGuard } from './guards/provider-publish.guard';



export const PROVIDER_ROUTES: Routes = [

  {

    path: 'centre',

    canActivate: [roleGuard([USER_ROLES.TRAINING_PROVIDER])],

    loadComponent: () =>

      import('./layout/provider-layout.component').then((m) => m.ProviderLayoutComponent),

    children: [

      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

      {

        path: 'dashboard',

        loadComponent: () =>

          import('./dashboard/provider-dashboard.component').then(

            (m) => m.ProviderDashboardComponent

          ),

      },

      {

        path: 'profil',

        loadComponent: () =>

          import('./profile/provider-profile.component').then((m) => m.ProviderProfileComponent),

      },

      {

        path: 'formations/nouveau',

        canActivate: [providerPublishGuard],

        loadComponent: () =>

          import('./publish-formation/publish-formation.component').then(

            (m) => m.PublishFormationComponent

          ),

      },

      {

        path: 'formations/:id',

        loadComponent: () =>

          import('./publish-formation/publish-formation.component').then(

            (m) => m.PublishFormationComponent

          ),

      },

      {

        path: 'evenements/nouveau',

        canActivate: [providerPublishGuard],

        loadComponent: () =>

          import('./publish-event/publish-event.component').then(

            (m) => m.PublishEventComponent

          ),

      },

      {

        path: 'evenements/:id',

        loadComponent: () =>

          import('./publish-event/publish-event.component').then(

            (m) => m.PublishEventComponent

          ),

      },

      {

        path: 'participants',

        loadComponent: () =>

          import('./participants/provider-participants.component').then(

            (m) => m.ProviderParticipantsComponent

          ),

      },

    ],

  },

  {

    path: 'etablissement',

    canActivate: [roleGuard([USER_ROLES.INSTITUTION_PROVIDER])],

    loadComponent: () =>

      import('./layout/provider-layout.component').then((m) => m.ProviderLayoutComponent),

    children: [

      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

      {

        path: 'dashboard',

        loadComponent: () =>

          import('./dashboard/provider-dashboard.component').then(

            (m) => m.ProviderDashboardComponent

          ),

      },

      {

        path: 'profil',

        loadComponent: () =>

          import('./profile/provider-profile.component').then((m) => m.ProviderProfileComponent),

      },

      {

        path: 'infos-personnelles',

        loadComponent: () =>

          import('./profile/provider-profile.component').then((m) => m.ProviderProfileComponent),

        data: { accountOnly: true },

      },

      {

        path: 'programmes',

        canActivate: [providerPublishGuard],

        loadComponent: () =>

          import('./institution-offerings/institution-offerings.component').then(

            (m) => m.InstitutionOfferingsComponent

          ),

        data: { offeringType: 'program' },

      },

      {

        path: 'publications/:id',

        canActivate: [providerPublishGuard],

        loadComponent: () =>

          import('./institution-offerings/institution-offerings.component').then(

            (m) => m.InstitutionOfferingsComponent

          ),

      },

      {

        path: 'evenements',

        canActivate: [providerPublishGuard],

        loadComponent: () =>

          import('./institution-offerings/institution-offerings.component').then(

            (m) => m.InstitutionOfferingsComponent

          ),

        data: { offeringType: 'event' },

      },

      {

        path: 'annonces',

        canActivate: [providerPublishGuard],

        loadComponent: () =>

          import('./institution-offerings/institution-offerings.component').then(

            (m) => m.InstitutionOfferingsComponent

          ),

        data: { offeringType: 'announcement' },

      },

    ],

  },

  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./provider-redirect.component').then((m) => m.ProviderRedirectComponent),
  },

];

