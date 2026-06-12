import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AdminCompanyListItem } from '../../../core/models/admin.model';
import { PaginationMeta } from '../../../core/models/pagination.model';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { AdminService } from '../services/admin.service';
import { AdminPaginationComponent } from '../shared/admin-pagination.component';
import { adminPageSummary } from '../shared/admin-pagination.util';

const PAGE_SIZE = 15;

@Component({
  selector: 'app-admin-companies-list',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink, AdminPaginationComponent],
  templateUrl: './companies-list.component.html',
  styleUrl: './companies-list.component.css',
})
export class CompaniesListComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);

  readonly routes = APP_ROUTES;
  readonly pageSize = PAGE_SIZE;
  readonly companies = signal<AdminCompanyListItem[]>([]);
  readonly pagination = signal<PaginationMeta | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly filters = this.fb.nonNullable.group({
    search: [''],
  });

  readonly toolbarSummary = computed(() => adminPageSummary(this.pagination(), 'entreprise'));
  readonly pageSummary = computed(() => {
    const companies = this.companies();
    return {
      total: companies.length,
      activeJobs: companies.reduce((sum, c) => sum + (c.activeJobsCount || 0), 0),
      applications: companies.reduce((sum, c) => sum + (c.applicationsCount || 0), 0),
      recruiters: companies.reduce((sum, c) => sum + (c.recruitersCount || 0), 0),
    };
  });

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const search = this.filters.getRawValue().search.trim();
    const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
    if (search) params['search'] = search;

    this.adminService.listCompanies(params).subscribe({
      next: (res) => {
        this.companies.set(res.data ?? []);
        this.pagination.set(res.pagination);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Impossible de charger les entreprises.');
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
}
