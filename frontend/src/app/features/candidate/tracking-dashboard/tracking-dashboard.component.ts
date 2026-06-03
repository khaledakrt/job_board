import {
  afterNextRender,
  Component,
  computed,
  inject,
  Injector,
  OnInit,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ApplicationTimelineComponent } from '../../../shared/components/application-timeline/application-timeline.component';
import { SafeHtmlComponent } from '../../../shared/components/safe-html/safe-html.component';
import { APPLICATION_STATUS_LABELS } from '../../../core/constants/application-status.constant';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { Application, ApplicationDetail } from '../../../core/models/application.model';
import { SavedJobItem, JobAlertItem } from '../../../core/models/candidate-profile.model';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { CandidateApplicationsService } from '../services/candidate-applications.service';
import { SavedJobService } from '../services/saved-job.service';
import { JobAlertService } from '../services/job-alert.service';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import { salaryDisplayLabel } from '../../../core/utils/job-display.util';
@Component({
  selector: 'app-tracking-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, ApplicationTimelineComponent, SafeHtmlComponent],
  templateUrl: './tracking-dashboard.component.html',
  styleUrl: './tracking-dashboard.component.css',
})
export class TrackingDashboardComponent implements OnInit {
  private readonly applicationsService = inject(CandidateApplicationsService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly savedJobService = inject(SavedJobService);
  private readonly alertService = inject(JobAlertService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  readonly routes = APP_ROUTES;
  readonly statusLabels = APPLICATION_STATUS_LABELS;

  readonly applications = signal<Application[]>([]);
  readonly savedJobs = signal<SavedJobItem[]>([]);
  readonly alerts = signal<JobAlertItem[]>([]);
  readonly loadingApps = signal(true);
  readonly loadingSaved = signal(true);
  readonly loadingAlerts = signal(true);
  readonly loadingDetail = signal(false);
  readonly error = signal<string | null>(null);
  readonly detailOpen = signal(false);
  readonly selectedApplication = signal<ApplicationDetail | null>(null);

  readonly stats = computed(() => {
    const apps = this.applications();
    return {
      total: apps.length,
      active: apps.filter((a) => !['rejected'].includes(a.status)).length,
      interview: apps.filter((a) => a.status === 'interview').length,
      offer: apps.filter((a) => a.status === 'offer').length,
      saved: this.savedJobs().length,
      alerts: this.alerts().length,
    };
  });

  ngOnInit(): void {
    this.loadApplications();
    this.loadSavedJobs();
    this.loadAlerts();
  }

  loadApplications(): void {
    this.loadingApps.set(true);
    this.applicationsService.list().subscribe({
      next: (res) => {
        this.applications.set(res.data || []);
        this.loadingApps.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger vos candidatures.');
        this.loadingApps.set(false);
      },
    });
  }

  loadSavedJobs(): void {
    this.loadingSaved.set(true);
    this.savedJobService.list().subscribe({
      next: (res) => {
        this.savedJobs.set(res.data || []);
        this.loadingSaved.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les offres enregistrées.');
        this.loadingSaved.set(false);
      },
    });
  }

  loadAlerts(): void {
    this.loadingAlerts.set(true);
    this.alertService.list().subscribe({
      next: (res) => {
        this.alerts.set(res.data || []);
        this.loadingAlerts.set(false);
      },
      error: () => {
        this.loadingAlerts.set(false);
      },
    });
  }

  openApplicationDetail(app: Application): void {
    this.loadingDetail.set(true);
    this.detailOpen.set(true);
    this.applicationsService.getById(app.id).subscribe({
      next: (res) => {
        this.selectedApplication.set(res.data || null);
        this.loadingDetail.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger le détail de la candidature.');
        this.loadingDetail.set(false);
        this.closeDetail();
      },
    });
    afterNextRender(
      () => document.getElementById('app-detail-dialog')?.focus(),
      { injector: this.injector }
    );
  }

  closeDetail(): void {
    this.detailOpen.set(false);
    this.selectedApplication.set(null);
  }

  openSavedJob(item: SavedJobItem): void {
    if (item.jobId) {
      void this.router.navigate([this.routes.CANDIDATE.JOBS], {
        queryParams: { jobId: item.jobId },
      });
    }
  }

  openPublicJob(jobId: string | undefined, event: Event): void {
    event.stopPropagation();
    if (!jobId) return;
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/offres', jobId])
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async removeSaved(item: SavedJobItem): Promise<void> {
    const title = item.job?.title || 'cette offre';
    const ok = await this.confirmDialog.confirm({
      title: 'Retirer l\'offre',
      message: `Retirer « ${title} » de vos offres sauvegardées ?`,
      confirmLabel: 'Retirer',
      confirmDanger: true,
    });
    if (!ok) return;

    this.savedJobService.remove(item.id).subscribe({
      next: () => {
        this.savedJobs.update((list) => list.filter((s) => s.id !== item.id));
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'Impossible de retirer l\'offre.');
      },
    });
  }

  async removeAlert(alert: JobAlertItem): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Supprimer l\'alerte',
      message: 'Supprimer cette alerte emploi ?',
      confirmLabel: 'Supprimer',
      confirmDanger: true,
    });
    if (!ok) return;

    this.alertService.remove(alert.id).subscribe({
      next: () => {
        this.alerts.update((list) => list.filter((a) => a.id !== alert.id));
      },
      error: () => this.error.set('Impossible de supprimer l\'alerte.'),
    });
  }

  companyName(app: Application): string {
    const job = app.job as { company?: { name?: string } } | undefined;
    return job?.company?.name || '—';
  }

  formatAlertFilters(filters: Record<string, unknown>): string {
    const parts: string[] = [];
    if (filters['keywords']) parts.push(`Mots-clés : ${filters['keywords']}`);
    if (filters['location']) parts.push(`Lieu : ${filters['location']}`);
    if (filters['company']) parts.push(`Entreprise : ${filters['company']}`);
    if (filters['industry']) parts.push(`Secteur : ${filters['industry']}`);
    if (filters['experience'] && filters['experience'] !== 'all') {
      parts.push(`Expérience : ${filters['experience']}`);
    }
    if (filters['quizOnly']) parts.push('Quiz technique uniquement');
    if (Array.isArray(filters['contracts']) && filters['contracts'].length) {
      parts.push(`Contrats : ${(filters['contracts'] as string[]).join(', ')}`);
    }
    if (Array.isArray(filters['remotes']) && filters['remotes'].length) {
      parts.push(`Télétravail : ${(filters['remotes'] as string[]).join(', ')}`);
    }
    return parts.length ? parts.join(' · ') : 'Toutes les offres correspondant à vos critères';
  }

  resolveLogo(url: string | null | undefined): string | null {
    return resolveUploadUrl(url);
  }

  formatSavedSalary(item: SavedJobItem): string | null {
    if (!item.job) return null;
    return salaryDisplayLabel(item.job);
  }

  resumeLink(url: string | null | undefined): string | null {
    return resolveUploadUrl(url);
  }
}
