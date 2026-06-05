import { Injectable, inject, computed, signal } from '@angular/core';
import { ProviderService } from './provider.service';
import { AuthService } from '../../../core/services/auth.service';
import { USER_ROLES } from '../../../core/constants/roles.constant';
import {
  ProviderDashboard,
  TrainingCenterDetail,
  TrainingFormationItem,
  TrainingEventItem,
  ProgramItem,
} from '../../../core/models/catalog.model';

@Injectable({ providedIn: 'root' })
export class ProviderContextService {
  private readonly providerService = inject(ProviderService);
  private readonly authService = inject(AuthService);

  readonly dashboard = signal<ProviderDashboard | null>(null);
  readonly formations = signal<TrainingFormationItem[]>([]);
  readonly events = signal<TrainingEventItem[]>([]);
  readonly programs = signal<ProgramItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly publishedFormations = computed(() =>
    this.formations().filter((f) => f.status === 'published')
  );
  readonly pendingFormations = computed(() =>
    this.formations().filter((f) => f.status === 'pending')
  );
  readonly publishedEvents = computed(() =>
    this.events().filter((e) => e.status === 'published')
  );
  readonly pendingEvents = computed(() =>
    this.events().filter((e) => e.status === 'pending')
  );
  readonly rejectedFormations = computed(() =>
    this.formations().filter((f) => f.status === 'rejected')
  );
  readonly rejectedEvents = computed(() =>
    this.events().filter((e) => e.status === 'rejected')
  );

  get isTraining(): boolean {
    return this.authService.user()?.role === USER_ROLES.TRAINING_PROVIDER;
  }

  statsSummary() {
    const d = this.dashboard();
    if (!d?.formationsSummary || !d?.eventsSummary) return null;
    return {
      formationsTotal: d.formationsSummary.total,
      formationsPublished: d.formationsSummary.published,
      eventsTotal: d.eventsSummary.total,
      eventsPublished: d.eventsSummary.published,
      pendingTotal: d.formationsSummary.pending + d.eventsSummary.pending,
    };
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const req = this.isTraining
      ? this.providerService.trainingDashboard()
      : this.providerService.institutionDashboard();

    req.subscribe({
      next: (res) => {
        const d = res.data ?? null;
        this.dashboard.set(d);
        this.loading.set(false);
        if (this.isTraining && d?.canPublishOfferings) {
          this.refreshOfferings();
        }
        if (!this.isTraining && d?.canPublishOfferings) {
          this.providerService.listInstitutionPrograms().subscribe({
            next: (r) => this.programs.set(r.data ?? []),
          });
        }
      },
      error: () => {
        this.error.set('Impossible de charger votre espace.');
        this.loading.set(false);
      },
    });
  }

  refreshOfferings(): void {
    if (!this.isTraining) return;
    this.providerService.listFormations().subscribe({
      next: (res) => this.formations.set(res.data ?? []),
    });
    this.providerService.listEvents().subscribe({
      next: (res) => this.events.set(res.data ?? []),
    });
  }

  organizationCity(): string {
    return this.dashboard()?.organization?.city ?? '';
  }

  trainingOrganization(): TrainingCenterDetail | null {
    const org = this.dashboard()?.organization;
    return this.isTraining && org ? (org as TrainingCenterDetail) : null;
  }
}
