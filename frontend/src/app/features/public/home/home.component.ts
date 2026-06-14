import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { USER_ROLES } from '../../../core/constants/roles.constant';
import { PublicShellComponent } from '../shared/public-shell.component';
import { PublicJobsBrowseComponent } from './public-jobs-browse/public-jobs-browse.component';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

interface LandingFeature {
  icon: string;
  titleKey: string;
  textKey: string;
}

interface LandingStep {
  num: string;
  titleKey: string;
  textKey: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, PublicShellComponent, PublicJobsBrowseComponent, TranslatePipe],
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
    if (role === USER_ROLES.TRAINING_PROVIDER) {
      return APP_ROUTES.PROVIDER.TRAINING;
    }
    if (role === USER_ROLES.INSTITUTION_PROVIDER) {
      return APP_ROUTES.PROVIDER.INSTITUTION;
    }
    return APP_ROUTES.CANDIDATE.DASHBOARD;
  });

  readonly candidateFeatures: LandingFeature[] = [
    {
      icon: '🔍',
      titleKey: 'home.candidate.feature.search.title',
      textKey: 'home.candidate.feature.search.text',
    },
    {
      icon: '📝',
      titleKey: 'home.candidate.feature.apply.title',
      textKey: 'home.candidate.feature.apply.text',
    },
    {
      icon: '🔔',
      titleKey: 'home.candidate.feature.alerts.title',
      textKey: 'home.candidate.feature.alerts.text',
    },
    {
      icon: '📊',
      titleKey: 'home.candidate.feature.tracking.title',
      textKey: 'home.candidate.feature.tracking.text',
    },
  ];

  readonly recruiterFeatures: LandingFeature[] = [
    {
      icon: '🏢',
      titleKey: 'home.recruiter.feature.page.title',
      textKey: 'home.recruiter.feature.page.text',
    },
    {
      icon: '✨',
      titleKey: 'home.recruiter.feature.jobs.title',
      textKey: 'home.recruiter.feature.jobs.text',
    },
    {
      icon: '🎯',
      titleKey: 'home.recruiter.feature.quiz.title',
      textKey: 'home.recruiter.feature.quiz.text',
    },
    {
      icon: '👥',
      titleKey: 'home.recruiter.feature.team.title',
      textKey: 'home.recruiter.feature.team.text',
    },
  ];

  readonly candidateSteps: LandingStep[] = [
    { num: '1', titleKey: 'home.candidate.step.profile.title', textKey: 'home.candidate.step.profile.text' },
    { num: '2', titleKey: 'home.candidate.step.jobs.title', textKey: 'home.candidate.step.jobs.text' },
    { num: '3', titleKey: 'home.candidate.step.track.title', textKey: 'home.candidate.step.track.text' },
  ];

  readonly recruiterSteps: LandingStep[] = [
    { num: '1', titleKey: 'home.recruiter.step.company.title', textKey: 'home.recruiter.step.company.text' },
    { num: '2', titleKey: 'home.recruiter.step.publish.title', textKey: 'home.recruiter.step.publish.text' },
    { num: '3', titleKey: 'home.recruiter.step.hire.title', textKey: 'home.recruiter.step.hire.text' },
  ];

  readonly highlights = [
    'home.features.companyProfile',
    'home.features.richEditor',
    'home.features.notifications',
    'home.features.emails',
  ];

}
