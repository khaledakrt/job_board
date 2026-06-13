import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { APPLICATION_STATUS_LABELS } from '../../../core/constants/application-status.constant';
import { JOB_STATUS_LABELS } from '../../../core/constants/job.constant';
import { Application } from '../../../core/models/application.model';
import { Job } from '../../../core/models/job.model';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { PaginationMeta } from '../../../core/models/pagination.model';
import { RecruiterApplicationService } from '../services/application.service';
import { RecruiterJobService } from '../services/job.service';

type ArchiveTab = 'applications' | 'jobs';
const ARCHIVE_PAGE_SIZE = 20;

@Component({
  selector: 'app-recruiter-archives',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './recruiter-archives.component.html',
  styleUrl: './recruiter-archives.component.css',
})
export class RecruiterArchivesComponent implements OnInit {
  private readonly applicationService = inject(RecruiterApplicationService);
  private readonly jobService = inject(RecruiterJobService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly routes = APP_ROUTES;
  readonly applicationStatusLabels = APPLICATION_STATUS_LABELS;
  readonly jobStatusLabels = JOB_STATUS_LABELS;
  readonly activeTab = signal<ArchiveTab>('applications');
  readonly applications = signal<Application[]>([]);
  readonly jobs = signal<Job[]>([]);
  readonly applicationsPagination = signal<PaginationMeta | null>(null);
  readonly jobsPagination = signal<PaginationMeta | null>(null);
  readonly applicationsPage = signal(1);
  readonly jobsPage = signal(1);
  readonly loading = signal(false);
  readonly actionLoading = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly summary = computed(() => ({
    applications: this.applicationsPagination()?.totalItems ?? this.applications().length,
    jobs: this.jobsPagination()?.totalItems ?? this.jobs().length,
    expiredJobs: this.jobs().filter((job) => job.status === 'expired').length,
    manualJobs: this.jobs().filter((job) => job.archivedAt).length,
  }));

  readonly applicationPageNumbers = computed(() => this.pageNumbers(this.applicationsPagination()));
  readonly jobPageNumbers = computed(() => this.pageNumbers(this.jobsPagination()));

  ngOnInit(): void {
    this.loadArchives();
  }

  setTab(tab: ArchiveTab): void {
    this.activeTab.set(tab);
  }

  loadArchives(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      applications: this.applicationService.list({
        archived: true,
        status: 'rejected',
        page: this.applicationsPage(),
        limit: ARCHIVE_PAGE_SIZE,
      }),
      jobs: this.jobService.list({
        archived: true,
        page: this.jobsPage(),
        limit: ARCHIVE_PAGE_SIZE,
      }),
    }).subscribe({
      next: ({ applications, jobs }) => {
        this.applications.set(applications.data || []);
        this.applicationsPagination.set(applications.pagination || null);
        this.applicationsPage.set(applications.pagination?.page || this.applicationsPage());
        this.jobs.set(jobs.data || []);
        this.jobsPagination.set(jobs.pagination || null);
        this.jobsPage.set(jobs.pagination?.page || this.jobsPage());
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les archives.');
        this.loading.set(false);
      },
    });
  }

  loadApplicationsArchive(page = this.applicationsPage(), finishLoading = true): void {
    this.applicationService
      .list({ archived: true, status: 'rejected', page, limit: ARCHIVE_PAGE_SIZE })
      .subscribe({
        next: (appRes) => {
          this.applications.set(appRes.data || []);
          this.applicationsPagination.set(appRes.pagination || null);
          this.applicationsPage.set(appRes.pagination?.page || page);
          if (finishLoading) this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger les candidatures archivées.');
          if (finishLoading) this.loading.set(false);
        },
      });
  }

  loadJobsArchive(page = this.jobsPage(), finishLoading = true): void {
    this.jobService.list({ archived: true, page, limit: ARCHIVE_PAGE_SIZE }).subscribe({
      next: (jobRes) => {
        this.jobs.set(jobRes.data || []);
        this.jobsPagination.set(jobRes.pagination || null);
        this.jobsPage.set(jobRes.pagination?.page || page);
        if (finishLoading) this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les offres archivées.');
        if (finishLoading) this.loading.set(false);
      },
    });
  }

  goToApplicationsPage(page: number): void {
    this.loading.set(true);
    this.loadApplicationsArchive(page);
  }

  goToJobsPage(page: number): void {
    this.loading.set(true);
    this.loadJobsArchive(page);
  }

  private pageNumbers(pagination: PaginationMeta | null): number[] {
    if (!pagination) return [];
    return Array.from({ length: pagination.totalPages }, (_, i) => i + 1);
  }

  async restoreApplication(application: Application): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Restaurer la candidature ?',
      message: 'Elle réapparaîtra dans le tableau ATS en Présélection.',
      confirmLabel: 'Restaurer',
    });
    if (!ok) return;

    this.actionLoading.set(application.id);
    this.applicationService.restore(application.id).subscribe({
      next: () => {
        this.message.set('Candidature restaurée dans l’ATS en Présélection.');
        this.actionLoading.set(null);
        this.loadArchives();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'Restauration impossible.');
        this.actionLoading.set(null);
      },
    });
  }

  async deleteApplication(application: Application): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Supprimer de l’archive ?',
      message: 'La candidature sera cachée pour le recruteur. L’admin gardera la trace.',
      confirmLabel: 'Supprimer',
      confirmDanger: true,
    });
    if (!ok) return;

    this.actionLoading.set(application.id);
    this.applicationService.deleteFromArchive(application.id).subscribe({
      next: () => {
        this.message.set('Candidature supprimée de l’archive recruteur.');
        this.actionLoading.set(null);
        this.loadArchives();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'Suppression impossible.');
        this.actionLoading.set(null);
      },
    });
  }

  async restoreJob(job: Job): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Restaurer cette offre ?',
      message:
        'L’offre reviendra dans la page Offres en brouillon. Vous pourrez la modifier puis la publier quand elle sera prête.',
      confirmLabel: 'Restaurer',
    });
    if (!ok) return;

    this.actionLoading.set(job.id);
    this.jobService.restore(job.id).subscribe({
      next: () => {
        this.message.set('Offre restaurée en brouillon.');
        this.actionLoading.set(null);
        this.loadArchives();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'Restauration impossible.');
        this.actionLoading.set(null);
      },
    });
  }

  async deleteJob(job: Job): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Supprimer de l’archive ?',
      message: 'L’offre sera cachée pour le recruteur. L’admin gardera la trace.',
      confirmLabel: 'Supprimer',
      confirmDanger: true,
    });
    if (!ok) return;

    this.actionLoading.set(job.id);
    this.jobService.delete(job.id).subscribe({
      next: () => {
        this.message.set('Offre supprimée de l’archive recruteur.');
        this.actionLoading.set(null);
        this.loadArchives();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'Suppression impossible.');
        this.actionLoading.set(null);
      },
    });
  }

  candidateName(application: Application): string {
    return [application.candidate?.firstName, application.candidate?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() || application.candidate?.email || 'Candidat';
  }
}
