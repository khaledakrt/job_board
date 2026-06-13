import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AdminCompanyListItem, AdminSubscriptionPolicy } from '../../../core/models/admin.model';
import { PaginationMeta } from '../../../core/models/pagination.model';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { AdminService } from '../services/admin.service';
import { AdminPaginationComponent } from '../shared/admin-pagination.component';
import { adminPageSummary } from '../shared/admin-pagination.util';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

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
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);

  readonly routes = APP_ROUTES;
  readonly pageSize = PAGE_SIZE;
  readonly companies = signal<AdminCompanyListItem[]>([]);
  readonly pagination = signal<PaginationMeta | null>(null);
  readonly loading = signal(false);
  readonly policyLoading = signal(false);
  readonly policyActionLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly subscriptionPolicy = signal<AdminSubscriptionPolicy | null>(null);

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
      activeSubscriptions: companies.filter((c) => c.subscription?.isActive).length,
    };
  });

  subscriptionLabel(company: AdminCompanyListItem): string {
    if (company.subscription?.isActive) return 'Actif';
    if (company.subscription?.status === 'canceled') return 'Annulé';
    return 'Aucun';
  }

  ngOnInit(): void {
    this.loadSubscriptionPolicy();
    this.load(1);
  }

  loadSubscriptionPolicy(): void {
    this.policyLoading.set(true);
    this.adminService.getSubscriptionPolicy().subscribe({
      next: (res) => {
        this.subscriptionPolicy.set(res.data ?? null);
        this.policyLoading.set(false);
      },
      error: () => {
        this.policyLoading.set(false);
      },
    });
  }

  async setGlobalPolicy(mode: AdminSubscriptionPolicy['mode']): Promise<void> {
    if (this.subscriptionPolicy()?.mode === mode || this.policyActionLoading()) return;
    const ok = await this.confirmDialog.confirm({
      title:
        mode === 'free_all'
          ? 'Rendre la publication gratuite pour tous ?'
          : 'Revenir au paiement par entreprise ?',
      message:
        mode === 'free_all'
          ? 'Toutes les entreprises pourront publier des offres sans abonnement, pour tous leurs recruteurs.'
          : 'Chaque entreprise devra avoir un abonnement actif ou un accès gratuit manuel pour que ses recruteurs publient.',
      confirmLabel: mode === 'free_all' ? 'Activer gratuit global' : 'Revenir au paiement',
      confirmDanger: mode === 'paid_required',
    });
    if (!ok) return;

    this.policyActionLoading.set(true);
    this.message.set(null);
    this.errorMessage.set(null);
    this.adminService.updateSubscriptionPolicy(mode).subscribe({
      next: () => {
        this.loadSubscriptionPolicy();
        this.message.set(
          mode === 'free_all'
            ? 'Mode gratuit global activé: toutes les entreprises peuvent publier.'
            : 'Mode paiement réactivé: les offres déjà publiées restent visibles; les nouvelles publications exigent un abonnement actif.'
        );
        this.policyActionLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Impossible de modifier la règle globale.');
        this.policyActionLoading.set(false);
      },
    });
  }

  policyLabel(mode: AdminSubscriptionPolicy['mode'] | undefined): string {
    return mode === 'free_all'
      ? 'Gratuit pour toutes les entreprises'
      : 'Paiement obligatoire par entreprise';
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
