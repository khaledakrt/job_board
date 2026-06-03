import { Injectable, computed, inject, signal } from '@angular/core';
import { CandidateProfileService } from './candidate-profile.service';
import { CandidateProfile } from '../../../core/models/candidate-profile.model';
import {
  computeProfileCompletion,
  profileNeedsAttention,
} from '../../../core/utils/candidate-profile.util';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CandidateContextService {
  private readonly profileService = inject(CandidateProfileService);

  readonly profile = signal<CandidateProfile | null>(null);
  readonly hasProfile = signal(false);
  readonly loading = signal(false);

  readonly profileCompletion = computed(() => computeProfileCompletion(this.profile()));
  readonly profileIncomplete = computed(() => profileNeedsAttention(this.profile()));

  loadProfile() {
    this.loading.set(true);
    return this.profileService.getProfile().pipe(
      tap({
        next: (res) => {
          this.profile.set(res.data || null);
          this.hasProfile.set(!!res.data);
          this.loading.set(false);
        },
        error: () => {
          this.profile.set(null);
          this.hasProfile.set(false);
          this.loading.set(false);
        },
      })
    );
  }

  setProfile(profile: CandidateProfile): void {
    this.profile.set(profile);
    this.hasProfile.set(true);
  }
}
