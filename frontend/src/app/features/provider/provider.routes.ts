import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role.guard';

import { USER_ROLES } from '../../core/constants/roles.constant';



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

        path: 'programmes',

        loadComponent: () =>

          import('./institution-offerings/institution-offerings.component').then(

            (m) => m.InstitutionOfferingsComponent

          ),

        data: { offeringType: 'program' },

      },

      {

        path: 'publications/:id',

        loadComponent: () =>

          import('./institution-offerings/institution-offerings.component').then(

            (m) => m.InstitutionOfferingsComponent

          ),

      },

      {

        path: 'evenements',

        loadComponent: () =>

          import('./institution-offerings/institution-offerings.component').then(

            (m) => m.InstitutionOfferingsComponent

          ),

        data: { offeringType: 'event' },

      },

      {

        path: 'annonces',

        loadComponent: () =>

          import('./institution-offerings/institution-offerings.component').then(

            (m) => m.InstitutionOfferingsComponent

          ),

        data: { offeringType: 'announcement' },

      },

      {

        path: 'offres-stages',

        loadComponent: () =>

          import('./institution-offerings/institution-offerings.component').then(

            (m) => m.InstitutionOfferingsComponent

          ),

        data: { offeringType: 'opportunity' },

      },

    ],

  },

  { path: '', pathMatch: 'full', redirectTo: 'centre' },

];

