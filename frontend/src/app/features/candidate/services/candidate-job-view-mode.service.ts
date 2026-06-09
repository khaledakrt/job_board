import { Injectable, signal } from '@angular/core';

export type CandidateJobsViewMode = 'linkedin' | 'cards';

@Injectable({ providedIn: 'root' })
export class CandidateJobViewModeService {
  readonly mode = signal<CandidateJobsViewMode>('linkedin');

  setMode(mode: CandidateJobsViewMode): void {
    this.mode.set(mode);
  }
}
