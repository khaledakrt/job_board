import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService } from '../services/admin.service';
import { AdminJobListItem } from '../../../core/models/admin.model';
import { PaginationMeta } from '../../../core/models/pagination.model';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { RouterLink } from '@angular/router';
import { JOB_STATUSES, JOB_STATUS_LABELS } from '../../../core/constants/job.constant';
import { AdminPaginationComponent } from '../shared/admin-pagination.component';
import { adminPageSummary } from '../shared/admin-pagination.util';

const PAGE_SIZE = 15;

@Component({
  selector: 'app-admin-jobs-list',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe, AdminPaginationComponent],
  templateUrl: './jobs-list.component.html',
  styleUrl: './jobs-list.component.css',
})
export class JobsListComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);
  readonly routes = APP_ROUTES;
  readonly statuses = JOB_STATUSES;
  readonly statusLabels = JOB_STATUS_LABELS;
  readonly pageSize = PAGE_SIZE;

  readonly jobs = signal<AdminJobListItem[]>([]);
  readonly pagination = signal<PaginationMeta | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly statusUpdating = signal<string | null>(null);

  readonly filters = this.fb.nonNullable.group({
    search: [''],
    status: [''],
  });

  readonly toolbarSummary = computed(() => adminPageSummary(this.pagination(), 'offre'));

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const f = this.filters.getRawValue();
    const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
    if (f.search) params['search'] = f.search;
    if (f.status) params['status'] = f.status;

    this.adminService.listJobs(params).subscribe({
      next: (res) => {
        this.jobs.set(res.data || []);
        this.pagination.set(res.pagination);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger les offres.');
        this.loading.set(false);
      },
    });
  }

  applyFilters(): void {
    this.load(1);
  }

  resetFilters(): void {
    this.filters.reset();
    this.load(1);
  }

  changeStatus(job: AdminJobListItem, status: string): void {
    this.statusUpdating.set(job.id);
    this.adminService.updateJobStatus(job.id, status).subscribe({
      next: () => {
        this.statusUpdating.set(null);
        this.load(this.pagination()?.page || 1);
      },
      error: () => this.statusUpdating.set(null),
    });
  }

  async deleteJob(job: AdminJobListItem): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Supprimer cette offre ?',
      message: job.title,
      confirmLabel: 'Supprimer',
      confirmDanger: true,
    });
    if (!ok) return;
    this.adminService.deleteJob(job.id).subscribe({
      next: () => this.load(this.pagination()?.page || 1),
      error: (err: HttpErrorResponse) =>
        this.errorMessage.set(err.error?.message || 'Suppression impossible'),
    });
  }
}
