import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { USER_ROLES } from '../../../core/constants/roles.constant';
import { PublicShellComponent } from '../shared/public-shell.component';
import { PublicJobsBrowseComponent } from './public-jobs-browse/public-jobs-browse.component';

interface LandingFeature {
  icon: string;
  title: string;
  text: string;
}

interface LandingStep {
  num: string;
  title: string;
  text: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, PublicShellComponent, PublicJobsBrowseComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  readonly authService = inject(AuthService);
  readonly routes = APP_ROUTES;
  readonly workspaceLink = computed(() => {
    const role = this.authService.user()?.role;
    if (role === USER_ROLES.ADMIN) {
      return APP_ROUTES.ADMIN.DASHBOARD;
    }
    if (role === USER_ROLES.RECRUITER) {
      return APP_ROUTES.RECRUITER.DASHBOARD;
    }
    return APP_ROUTES.CANDIDATE.DASHBOARD;
  });

  readonly candidateFeatures: LandingFeature[] = [
    {
      icon: '🔍',
      title: 'Recherche intelligente',
      text: 'Filtrez par lieu, contrat, télétravail et mots-clés pour trouver les offres qui vous correspondent.',
    },
    {
      icon: '📝',
      title: 'Candidature guidée',
      text: 'Lettre de motivation, CV et quiz technique intégrés dans un parcours simple et rapide.',
    },
    {
      icon: '🔔',
      title: 'Alertes emploi',
      text: 'Soyez prévenu des nouvelles offres correspondant à vos critères.',
    },
    {
      icon: '📊',
      title: 'Suivi en temps réel',
      text: 'Visualisez l’état de vos candidatures : reçue, entretien, offre, refus…',
    },
  ];

  readonly recruiterFeatures: LandingFeature[] = [
    {
      icon: '🏢',
      title: 'Page employeur',
      text: 'Présentez votre entreprise, logo, avantages et culture pour attirer les bons profils.',
    },
    {
      icon: '✨',
      title: 'Offres enrichies',
      text: 'Description mise en forme, compétences, langues, salaire et avantages (tickets resto, télétravail…).',
    },
    {
      icon: '🎯',
      title: 'Quiz de présélection',
      text: 'Posez 2 questions techniques : le candidat répond, vous voyez vert ou rouge dans l’ATS.',
    },
    {
      icon: '👥',
      title: 'ATS & équipe',
      text: 'Pipeline candidatures, notes, statuts et collaboration RH avec droits par rôle.',
    },
  ];

  readonly candidateSteps: LandingStep[] = [
    { num: '1', title: 'Créez votre profil', text: 'CV, compétences et préférences en quelques minutes.' },
    { num: '2', title: 'Explorez les offres', text: 'Parcourez, sauvegardez et postulez en un clic.' },
    { num: '3', title: 'Suivez vos candidatures', text: 'Restez informé à chaque étape du processus.' },
  ];

  readonly recruiterSteps: LandingStep[] = [
    { num: '1', title: 'Inscrivez votre entreprise', text: 'Profil société complet pour inspirer confiance.' },
    { num: '2', title: 'Publiez vos offres', text: 'Rédaction assistée, quiz optionnel, publication flexible.' },
    { num: '3', title: 'Recrutez avec l’ATS', text: 'Triez, évaluez les quiz et pilotez vos embauches.' },
  ];

  readonly highlights = [
    'Profil entreprise avec barre de complétion',
    'Éditeur riche pour les descriptions d’offre',
    'Notifications recruteur en temps réel',
    'E-mails transactionnels (candidature, équipe, alertes)',
  ];

}
