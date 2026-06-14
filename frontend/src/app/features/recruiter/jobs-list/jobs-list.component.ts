import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Job } from '../../../core/models/job.model';
import {
  JOB_STATUSES,
  JOB_STATUS_LABELS,
  JobStatus,
  isJobPubliclyVisible,
} from '../../../core/constants/job.constant';
import { daysUntilExpiration } from '../../../core/utils/job-expiration.util';
import { PaginationMeta } from '../../../core/models/pagination.model';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { RecruiterJobService } from '../services/job.service';
import { RecruiterContextService } from '../services/recruiter-context.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { PublicationAccessDialogService } from '../services/publication-access-dialog.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-jobs-list',
  standalone: true,
  imports: [RouterLink, DatePipe, TranslatePipe],
  templateUrl: './jobs-list.component.html',
  styleUrl: './jobs-list.component.css',
})
export class JobsListComponent implements OnInit {
  private readonly jobService = inject(RecruiterJobService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly publicationAccessDialog = inject(PublicationAccessDialogService);
  readonly context = inject(RecruiterContextService);

  readonly jobs = signal<Job[]>([]);
  readonly pagination = signal<PaginationMeta | null>(null);
  readonly currentPage = signal(1);
  readonly statusFilter = signal<JobStatus | ''>('');
  readonly loading = signal(false);
  readonly statusUpdating = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly statusLabels = JOB_STATUS_LABELS;
  readonly statusOptions = JOB_STATUSES.filter(
    (status) => status !== 'expired'
  ) as JobStatus[];
  readonly routes = APP_ROUTES;
  readonly pageSize = PAGE_SIZE;

  readonly pageSummary = computed(() => {
    const p = this.pagination();
    if (!p) return '';
    const start = (p.page - 1) * p.limit + 1;
    const end = Math.min(p.page * p.limit, p.totalItems);
    return `${start}–${end} sur ${p.totalItems} offre${p.totalItems > 1 ? 's' : ''}`;
  });

  readonly pageNumbers = computed(() => {
    const p = this.pagination();
    if (!p) return [];
    return Array.from({ length: p.totalPages }, (_, i) => i + 1);
  });

  ngOnInit(): void {
    this.loadJobs(1);
  }

  loadJobs(page: number): void {
    this.loading.set(true);
    this.currentPage.set(page);

    const status = this.statusFilter() || undefined;

    this.jobService.list({ page, limit: PAGE_SIZE, status }).subscribe({
      next: (res) => {
        this.jobs.set(res.data || []);
        this.pagination.set(res.pagination || null);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les offres.');
        this.loading.set(false);
      },
    });
  }

  onStatusFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as JobStatus | '';
    this.statusFilter.set(value);
    this.loadJobs(1);
  }

  goToPage(page: number): void {
    const p = this.pagination();
    if (!p || page < 1 || page > p.totalPages) return;
    this.loadJobs(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async setStatus(job: Job, status: JobStatus): Promise<void> {
    if (job.status === status) return;

    if (status === 'active' && !this.context.canPublishJobs()) {
      await this.publicationAccessDialog.showPublishBlocked();
      return;
    }

    const ok = await this.confirmDialog.confirm({
      title: 'Modifier la visibilité',
      message: `Passer « ${job.title} » au statut « ${JOB_STATUS_LABELS[status]} » ?`,
      confirmLabel: 'Confirmer',
    });
    if (!ok) return;

    this.statusUpdating.set(job.id);
    this.jobService.updateStatus(job.id, status).subscribe({
      next: () => {
        this.message.set(
          status === 'hidden'
            ? 'Offre masquée. Elle reste disponible dans votre liste.'
            : `Statut mis à jour : ${JOB_STATUS_LABELS[status]}.`
        );
        this.statusUpdating.set(null);
        this.loadJobs(this.currentPage());
      },
      error: (err: HttpErrorResponse) => {
        if (this.publicationAccessDialog.isPublishBlockedError(err)) {
          void this.publicationAccessDialog.showPublishBlocked();
        } else {
          this.error.set(err.error?.message || 'Échec de la mise à jour du statut.');
        }
        this.statusUpdating.set(null);
      },
    });
  }

  async archiveJob(job: Job): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Archiver cette offre ?',
      message:
        'Elle quittera la liste active et restera récupérable depuis Archives. Vous pourrez la restaurer plus tard en brouillon, la modifier puis la republier.',
      confirmLabel: 'Archiver',
    });
    if (!ok) return;

    this.statusUpdating.set(job.id);
    this.jobService.archive(job.id).subscribe({
      next: () => {
        this.message.set('Offre archivée. Elle reste récupérable depuis Archives.');
        this.statusUpdating.set(null);
        this.loadJobs(this.currentPage());
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'Archivage impossible.');
        this.statusUpdating.set(null);
      },
    });
  }

  statusBadgeClass(status: JobStatus): string {
    return `badge badge-${status}`;
  }

  canActivate(job: Job): boolean {
    return job.status !== 'active';
  }

  canHide(job: Job): boolean {
    return job.status === 'active';
  }

  expirationLabel(job: Job): string {
    if (job.status === 'expired') return 'Expirée';
    const days = daysUntilExpiration(job.expiresAt);
    if (days < 0) return 'Échue';
    if (days === 0) return 'Aujourd\'hui';
    if (days === 1) return 'Demain';
    return `J-${days}`;
  }

  isPastExpiration(job: Job): boolean {
    return daysUntilExpiration(job.expiresAt) < 0;
  }

  isPublic(job: Job): boolean {
    return isJobPubliclyVisible(job.status);
  }
}
