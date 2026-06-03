import { Component, computed, input } from '@angular/core';
import { ApplicationStatus } from '../../../core/constants/application-status.constant';

const STEPS: { key: ApplicationStatus | 'terminal'; label: string; short: string }[] = [
  { key: 'applied', label: 'Candidature', short: 'Envoyée' },
  { key: 'screening', label: 'Présélection', short: 'Présel.' },
  { key: 'interview', label: 'Entretien', short: 'Entretien' },
  { key: 'offer', label: 'Offre', short: 'Offre' },
  { key: 'rejected', label: 'Refus', short: 'Refus' },
];

@Component({
  selector: 'app-application-timeline',
  standalone: true,
  templateUrl: './application-timeline.component.html',
  styleUrl: './application-timeline.component.css',
})
export class ApplicationTimelineComponent {
  readonly status = input.required<ApplicationStatus>();
  readonly compact = input(false);

  readonly steps = computed(() => {
    const useShort = this.compact();
    const current = this.status();
    const terminal = current === 'rejected';
    const activeIndex = terminal
      ? 4
      : STEPS.findIndex((s) => s.key === current);

    return STEPS.map((step, index) => {
      let state: 'complete' | 'current' | 'upcoming' | 'terminal' = 'upcoming';
      if (terminal && step.key === 'rejected') {
        state = 'terminal';
      } else if (index < activeIndex) {
        state = 'complete';
      } else if (index === activeIndex && !terminal) {
        state = 'current';
      } else if (terminal && index < 4) {
        state = index <= 2 ? 'complete' : 'upcoming';
      }
      return {
        ...step,
        state,
        displayLabel: useShort ? step.short : step.label,
      };
    });
  });
}
