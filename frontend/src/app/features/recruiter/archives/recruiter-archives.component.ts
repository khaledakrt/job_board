import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { APPLICATION_STATUS_LABELS } from '../../../core/constants/application-status.constant';
import { JOB_STATUS_LABELS, JobStatus } from '../../../core/constants/job.constant';
import { Application } from '../../../core/models/application.model';
import { Job } from '../../../core/models/job.model';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { RecruiterApplicationService } from '../services/application.service';
import { RecruiterJobService } from '../services/job.service';

type ArchiveTab = 'applications' | 'jobs';

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
  readonly loading = signal(false);
  readonly actionLoading = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly summary = computed(() => ({
    applications: this.applications().length,
    jobs: this.jobs().length,
    expiredJobs: this.jobs().filter((job) => job.status === 'expired').length,
    hiddenJobs: this.jobs().filter((job) => job.status === 'hidden').length,
  }));

  ngOnInit(): void {
    this.loadArchives();
  }

  setTab(tab: ArchiveTab): void {
    this.activeTab.set(tab);
  }

  loadArchives(): void {
    this.loading.set(true);
    this.error.set(null);
    this.applicationService
      .list({ archived: true, status: 'rejected', page: 1, limit: 50 })
      .subscribe({
        next: (appRes) => {
          this.applications.set(appRes.data || []);
          this.jobService.list({ archived: true, page: 1, limit: 50 }).subscribe({
            next: (jobRes) => {
              this.jobs.set(jobRes.data || []);
              this.loading.set(false);
            },
            error: () => {
              this.error.set('Impossible de charger les offres archivées.');
              this.loading.set(false);
            },
          });
        },
        error: () => {
          this.error.set('Impossible de charger les candidatures archivées.');
          this.loading.set(false);
        },
      });
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
    const targetStatus: JobStatus = 'active';
    const ok = await this.confirmDialog.confirm({
      title: 'Restaurer cette offre ?',
      message: 'L’offre repassera en active et reviendra dans la page Offres.',
      confirmLabel: 'Restaurer',
    });
    if (!ok) return;

    this.actionLoading.set(job.id);
    this.jobService.updateStatus(job.id, targetStatus).subscribe({
      next: () => {
        this.message.set('Offre restaurée.');
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
