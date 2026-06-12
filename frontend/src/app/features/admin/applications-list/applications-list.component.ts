import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AdminApplicationListItem } from '../../../core/models/admin.model';
import { PaginationMeta } from '../../../core/models/pagination.model';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  ApplicationStatus,
} from '../../../core/constants/application-status.constant';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { AdminService } from '../services/admin.service';
import { AdminPaginationComponent } from '../shared/admin-pagination.component';
import { adminPageSummary } from '../shared/admin-pagination.util';

const PAGE_SIZE = 15;

@Component({
  selector: 'app-admin-applications-list',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink, AdminPaginationComponent],
  templateUrl: './applications-list.component.html',
  styleUrl: './applications-list.component.css',
})
export class ApplicationsListComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);

  readonly routes = APP_ROUTES;
  readonly statuses = APPLICATION_STATUSES;
  readonly statusLabels = APPLICATION_STATUS_LABELS;
  readonly pageSize = PAGE_SIZE;
  readonly applications = signal<AdminApplicationListItem[]>([]);
  readonly pagination = signal<PaginationMeta | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly filters = this.fb.nonNullable.group({
    search: [''],
    status: [''],
  });

  readonly toolbarSummary = computed(() => adminPageSummary(this.pagination(), 'candidature'));
  readonly pageSummary = computed(() => {
    const applications = this.applications();
    return {
      total: applications.length,
      interview: applications.filter((a) => a.status === 'interview').length,
      withResume: applications.filter((a) => a.hasResume).length,
      withQuiz: applications.filter((a) => a.hasQuizAnswers).length,
    };
  });

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const f = this.filters.getRawValue();
    const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
    if (f.search.trim()) params['search'] = f.search.trim();
    if (f.status) params['status'] = f.status;

    this.adminService.listApplications(params).subscribe({
      next: (res) => {
        this.applications.set(res.data ?? []);
        this.pagination.set(res.pagination);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Impossible de charger les candidatures.');
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

  statusLabel(status: string): string {
    return APPLICATION_STATUS_LABELS[status as ApplicationStatus] ?? status;
  }
}
