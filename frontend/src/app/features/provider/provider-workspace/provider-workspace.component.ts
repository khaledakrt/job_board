import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProviderService } from '../services/provider.service';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { USER_ROLES } from '../../../core/constants/roles.constant';
import {
  PrivateInstitutionDetail,
  ProviderDashboard,
  TrainingCenterDetail,
  TrainingCourseItem,
  TrainingFormationItem,
  TrainingEventItem,
  ProgramItem,
} from '../../../core/models/catalog.model';
import {
  catalogStatusLabel,
  eventTypeLabel,
} from '../../public/shared/catalog-offerings.constants';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';

@Component({
  selector: 'app-provider-workspace',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './provider-workspace.component.html',
  styleUrls: ['./provider-workspace.component.css'],
})
export class ProviderWorkspaceComponent implements OnInit {
  private readonly providerService = inject(ProviderService);
  readonly authService = inject(AuthService);

  readonly routes = APP_ROUTES;
  readonly dashboard = signal<ProviderDashboard | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly courses = signal<TrainingCourseItem[]>([]);
  readonly formations = signal<TrainingFormationItem[]>([]);
  readonly events = signal<TrainingEventItem[]>([]);
  readonly programs = signal<ProgramItem[]>([]);
  readonly offeringStatusLabel = catalogStatusLabel;
  readonly eventTypeLabel = eventTypeLabel;

  description = '';
  website = '';
  trainingDomain = '';
  newCourseTitle = '';
  newCourseDescription = '';
  newProgramTitle = '';

  get isTraining(): boolean {
    return this.authService.user()?.role === USER_ROLES.TRAINING_PROVIDER;
  }

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    const req = this.isTraining
      ? this.providerService.trainingDashboard()
      : this.providerService.institutionDashboard();

    req.subscribe({
      next: (res) => {
        const d = res.data ?? null;
        this.dashboard.set(d);
        if (d?.organization) {
          this.description = d.organization.description ?? '';
          this.website = (d.organization as TrainingCenterDetail).website ?? '';
          if (this.isTraining) {
            this.trainingDomain = (d.organization as TrainingCenterDetail).trainingDomain ?? '';
          }
        }
        this.loading.set(false);
        if (this.isTraining && d?.canPublishOfferings) {
          this.loadOfferings();
        }
        if (!this.isTraining && d?.canPublishOfferings) {
          this.loadPrograms();
        }
      },
      error: () => {
        this.error.set('Impossible de charger votre espace.');
        this.loading.set(false);
      },
    });
  }

  loadOfferings(): void {
    this.providerService.listFormations().subscribe({
      next: (res) => this.formations.set(res.data ?? []),
    });
    this.providerService.listEvents().subscribe({
      next: (res) => this.events.set(res.data ?? []),
    });
  }

  loadCourses(): void {
    this.providerService.listTrainingCourses().subscribe({
      next: (res) => this.courses.set(res.data ?? []),
    });
  }

  loadPrograms(): void {
    this.providerService.listInstitutionPrograms().subscribe({
      next: (res) => this.programs.set(res.data ?? []),
    });
  }

  statsSummary(): {
    formationsTotal: number;
    formationsPublished: number;
    eventsTotal: number;
    eventsPublished: number;
    pendingTotal: number;
  } | null {
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

  offeringStatusClass(status: string | undefined): string {
    if (status === 'published') return 'provider-badge provider-badge--published';
    if (status === 'rejected') return 'provider-badge provider-badge--rejected';
    return 'provider-badge provider-badge--pending';
  }

  statusLabel(status: string): string {
    if (status === 'published') return 'Compte validé — visible sur le site';
    if (status === 'pending') return 'En attente de validation administrateur';
    if (status === 'rejected') return 'Demande refusée';
    return status;
  }

  mediaUrl(url: string | null | undefined): string | null {
    return resolveUploadUrl(url ?? null);
  }

  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const req = this.isTraining
      ? this.providerService.uploadTrainingLogo(file)
      : this.providerService.uploadInstitutionLogo(file);
    req.subscribe({ next: () => this.reload() });
  }

  onBrochureSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const req = this.isTraining
      ? this.providerService.uploadTrainingBrochure(file)
      : this.providerService.uploadInstitutionBrochure(file);
    req.subscribe({ next: () => this.reload() });
  }

  saveProfile(): void {
    const body: Record<string, unknown> = {
      description: this.description.trim(),
      website: this.website.trim() || null,
    };
    if (this.isTraining) {
      body['trainingDomain'] = this.trainingDomain.trim() || null;
    }
    const req = this.isTraining
      ? this.providerService.updateTrainingProfile(body)
      : this.providerService.updateInstitutionProfile(body);
    req.subscribe({ next: (res) => this.dashboard.set(res.data ?? null) });
  }

  addCourse(): void {
    if (!this.newCourseTitle.trim()) return;
    this.providerService
      .createTrainingCourse({
        title: this.newCourseTitle.trim(),
        description: this.newCourseDescription.trim() || null,
        status: 'published',
      })
      .subscribe({
        next: () => {
          this.newCourseTitle = '';
          this.newCourseDescription = '';
          this.loadCourses();
        },
      });
  }

  addProgram(): void {
    if (!this.newProgramTitle.trim()) return;
    this.providerService
      .addInstitutionProgram({ title: this.newProgramTitle.trim() })
      .subscribe({
        next: (res) => {
          this.programs.set(res.data ?? []);
          this.newProgramTitle = '';
        },
      });
  }

  deleteCourse(id: string | undefined): void {
    if (!id) return;
    this.providerService.deleteTrainingCourse(id).subscribe({ next: () => this.loadCourses() });
  }

  deleteFormation(id: string): void {
    this.providerService.deleteFormation(id).subscribe({ next: () => this.loadOfferings() });
  }

  deleteEvent(id: string): void {
    this.providerService.deleteEvent(id).subscribe({ next: () => this.loadOfferings() });
  }

  publicPageLink(): string[] {
    const org = this.dashboard()?.organization;
    if (!org?.id) return ['/'];
    return this.isTraining
      ? ['/centres-formation', org.id]
      : ['/etablissements-prives', org.id];
  }
}
