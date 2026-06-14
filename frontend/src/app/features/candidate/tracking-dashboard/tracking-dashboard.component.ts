import {
  afterNextRender,
  Component,
  computed,
  inject,
  Injector,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ApplicationTimelineComponent } from '../../../shared/components/application-timeline/application-timeline.component';
import { ApplicationQuizReviewComponent } from '../../../shared/components/application-quiz-review/application-quiz-review.component';
import { SafeHtmlComponent } from '../../../shared/components/safe-html/safe-html.component';
import { CandidateDashboardService, DashboardSummary } from '../services/candidate-dashboard.service';
import { Job } from '../../../core/models/job.model';
import { APPLICATION_STATUS_LABELS } from '../../../core/constants/application-status.constant';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { Application, ApplicationDetail } from '../../../core/models/application.model';
import { SavedJobItem, JobAlertItem } from '../../../core/models/candidate-profile.model';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import {
  CandidateApplicationsService,
  PaginationMeta,
} from '../services/candidate-applications.service';
import { SavedJobService } from '../services/saved-job.service';
import { JobAlertService } from '../services/job-alert.service';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import { salaryDisplayLabel } from '../../../core/utils/job-display.util';
import { ProtectedFileService } from '../../../core/services/protected-file.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
@Component({
  selector: 'app-tracking-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    ApplicationTimelineComponent,
    ApplicationQuizReviewComponent,
    SafeHtmlComponent,
    TranslatePipe,
  ],
  templateUrl: './tracking-dashboard.component.html',
  styleUrl: './tracking-dashboard.component.css',
})
export class TrackingDashboardComponent implements OnInit, OnDestroy {
  private readonly applicationsService = inject(CandidateApplicationsService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly savedJobService = inject(SavedJobService);
  private readonly alertService = inject(JobAlertService);
  private readonly dashboardService = inject(CandidateDashboardService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly protectedFileService = inject(ProtectedFileService);
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  readonly routes = APP_ROUTES;
  readonly statusLabels = APPLICATION_STATUS_LABELS;

  readonly appScope = signal<'active' | 'archived'>('active');
  readonly filterStatus = signal<string>('');
  readonly searchQ = signal('');
  readonly appPage = signal(1);
  readonly appLimit = 8;

  readonly applications = signal<Application[]>([]);
  readonly applicationsPagination = signal<PaginationMeta | null>(null);
  readonly dashboardSummary = signal<DashboardSummary | null>(null);
  readonly recommendedJobs = signal<(Job & { matchScore?: number })[]>([]);
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
  readonly savedJobsPreview = computed(() => this.savedJobs().slice(0, 4));
  readonly alertsPreview = computed(() => this.alerts().slice(0, 4));

  ngOnInit(): void {
    this.loadApplications();
    this.loadSavedJobs();
    this.loadAlerts();
    this.dashboardService.getSummary().subscribe({
      next: (res) => this.dashboardSummary.set(res.data || null),
    });
    this.dashboardService.getRecommendedJobs().subscribe({
      next: (res) => this.recommendedJobs.set(res.data || []),
    });
  }

  ngOnDestroy(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
  }

  reloadApplications(): void {
    this.appPage.set(1);
    this.loadApplications();
  }

  setAppScope(scope: 'active' | 'archived'): void {
    this.appScope.set(scope);
    this.appPage.set(1);
    this.loadApplications();
  }

  setApplicationStatusFilter(status: string): void {
    this.filterStatus.set(status);
    this.appPage.set(1);
    this.loadApplications();
  }

  setApplicationSearch(query: string): void {
    this.searchQ.set(query);
    this.appPage.set(1);
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.loadApplications();
      this.searchDebounce = null;
    }, 350);
  }

  goToApplicationsPage(page: number): void {
    const pagination = this.applicationsPagination();
    const totalPages = pagination?.totalPages ?? 1;
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    if (nextPage === this.appPage() && pagination) return;
    this.appPage.set(nextPage);
    this.loadApplications();
  }

  loadApplications(): void {
    this.loadingApps.set(true);
    this.applicationsService
      .list({
        scope: this.appScope(),
        status: this.filterStatus() || undefined,
        q: this.searchQ() || undefined,
        page: this.appPage(),
        limit: this.appLimit,
      })
      .subscribe({
      next: (res) => {
        this.applications.set(res.data || []);
        this.applicationsPagination.set(res.pagination || null);
        if (res.pagination?.page && res.pagination.page !== this.appPage()) {
          this.appPage.set(res.pagination.page);
        }
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

  async archiveRejectedApplication(detail: ApplicationDetail): Promise<void> {
    if (detail.status !== 'rejected') return;

    const title = detail.job?.title || 'cette candidature';
    const ok = await this.confirmDialog.confirm({
      title: 'Masquer la candidature',
      message: `Masquer « ${title} » de la liste active ? Elle restera disponible dans les archives.`,
      confirmLabel: 'Masquer',
    });
    if (!ok) return;

    this.applicationsService.archiveRejected(detail.id).subscribe({
      next: () => {
        this.closeDetail();
        this.loadApplications();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'Impossible de masquer la candidature.');
      },
    });
  }

  companyName(app: Application): string {
    const job = app.job as { company?: { name?: string } } | undefined;
    return job?.company?.name || '—';
  }

  statusDescription(status: Application['status']): string {
    const descriptions: Record<Application['status'], string> = {
      applied: 'Votre candidature a bien été envoyée au recruteur.',
      screening: 'Le recruteur analyse votre profil et vos réponses.',
      interview: 'Vous êtes dans l’étape entretien. Consultez les messages et la date prévue.',
      offer: 'Bonne nouvelle : le recruteur a marqué cette candidature comme offre.',
      rejected: 'Cette candidature n’a pas été retenue pour cette offre.',
    };
    return descriptions[status];
  }

  applicationRangeLabel(): string {
    const pagination = this.applicationsPagination();
    if (!pagination || pagination.totalItems === 0) return 'Aucune candidature';
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.totalItems);
    return `${start}-${end} sur ${pagination.totalItems}`;
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
    return this.protectedFileService.resolveUrl(url);
  }

  openResume(url: string | null | undefined, event?: Event): void {
    event?.preventDefault();
    const resolved = this.resumeLink(url);
    if (!resolved) return;

    this.protectedFileService.openFile(resolved);
  }

  chartMax(): number {
    const months = this.dashboardSummary()?.monthlyApplications || [];
    return Math.max(1, ...months.map((m) => m.count));
  }

  downloadInterviewIcs(detail: ApplicationDetail): void {
    if (!detail.interviewAt) return;
    const start = new Date(detail.interviewAt);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const fmt = (d: Date) =>
      d
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');
    const title = encodeURIComponent(`Entretien — ${detail.job?.title || 'JobBoard'}`);
    const body = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${title}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'entretien-jobboard.ics';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  openRecommended(jobId: string): void {
    void this.router.navigate([this.routes.CANDIDATE.JOBS], { queryParams: { jobId } });
  }
}
