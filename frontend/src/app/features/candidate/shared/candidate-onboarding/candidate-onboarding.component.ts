import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { APP_ROUTES } from '../../../../core/constants/routes.constant';
import { CandidateContextService } from '../../services/candidate-context.service';
import { CandidateProfileService } from '../../services/candidate-profile.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { ModalKeyboardDirective } from '../../../../shared/directives/modal-keyboard.directive';

@Component({
  selector: 'app-candidate-onboarding',
  standalone: true,
  imports: [RouterLink, TranslatePipe, ModalKeyboardDirective],
  templateUrl: './candidate-onboarding.component.html',
  styleUrl: './candidate-onboarding.component.css',
})
export class CandidateOnboardingComponent {
  private readonly context = inject(CandidateContextService);
  private readonly profileService = inject(CandidateProfileService);
  private readonly router = inject(Router);

  readonly routes = APP_ROUTES;
  readonly step = signal(1);
  readonly saving = signal(false);
  readonly dismissedForSession = signal(false);
  readonly onboardingError = signal<string | null>(null);

  visible(): boolean {
    if (this.dismissedForSession()) return false;
    const p = this.context.profile();
    if (this.needsProfileCreation() && this.isProfilePage()) return false;
    return !this.context.loading() && (!this.context.hasProfile() || !p?.onboardingCompletedAt);
  }

  needsProfileCreation(): boolean {
    return !this.context.hasProfile();
  }

  private isProfilePage(): boolean {
    return this.router.url.split('?')[0] === APP_ROUTES.CANDIDATE.PROFILE;
  }

  next(): void {
    if (this.step() < 3) {
      this.step.update((s) => s + 1);
    } else {
      this.complete();
    }
  }

  skip(): void {
    if (this.needsProfileCreation()) return;
    this.complete();
  }

  dismissForNow(): void {
    this.dismissedForSession.set(true);
  }

  complete(): void {
    if (this.needsProfileCreation()) return;
    this.saving.set(true);
    this.onboardingError.set(null);
    this.profileService.updateProfile({ onboardingCompleted: true }).subscribe({
      next: (res) => {
        if (res.data) this.context.setProfile(res.data);
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.onboardingError.set('Impossible de finaliser l’introduction. Réessayez.');
      },
    });
  }
}
