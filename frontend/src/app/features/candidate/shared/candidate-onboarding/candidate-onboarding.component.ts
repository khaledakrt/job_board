import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_ROUTES } from '../../../../core/constants/routes.constant';
import { CandidateContextService } from '../../services/candidate-context.service';
import { CandidateProfileService } from '../../services/candidate-profile.service';

@Component({
  selector: 'app-candidate-onboarding',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './candidate-onboarding.component.html',
  styleUrl: './candidate-onboarding.component.css',
})
export class CandidateOnboardingComponent {
  private readonly context = inject(CandidateContextService);
  private readonly profileService = inject(CandidateProfileService);

  readonly routes = APP_ROUTES;
  readonly step = signal(1);
  readonly saving = signal(false);

  visible(): boolean {
    const p = this.context.profile();
    return !this.context.loading() && (!this.context.hasProfile() || !p?.onboardingCompletedAt);
  }

  needsProfileCreation(): boolean {
    return !this.context.hasProfile();
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

  complete(): void {
    if (this.needsProfileCreation()) return;
    this.saving.set(true);
    this.profileService.updateProfile({ onboardingCompleted: true }).subscribe({
      next: (res) => {
        if (res.data) this.context.setProfile(res.data);
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }
}
