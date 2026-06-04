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
    return this.context.hasProfile() && !p?.onboardingCompletedAt;
  }

  next(): void {
    if (this.step() < 3) {
      this.step.update((s) => s + 1);
    } else {
      this.complete();
    }
  }

  skip(): void {
    this.complete();
  }

  complete(): void {
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
