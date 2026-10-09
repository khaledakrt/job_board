import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { AdminStats, AdminSubscriptionPolicy } from '../../../core/models/admin.model';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly i18n = inject(I18nService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  readonly routes = APP_ROUTES;

  readonly stats = signal<AdminStats | null>(null);
  readonly loading = signal(true);
  readonly subscriptionPolicy = signal<AdminSubscriptionPolicy | null>(null);
  readonly policyLoading = signal(false);
  readonly policyMessage = signal<string | null>(null);
  readonly policyError = signal<string | null>(null);

  readonly moderationQueue = computed(() => {
    this.i18n.language();
    const s = this.stats();
    if (!s) return [];
    return [
      {
        label: this.i18n.translate('admin.dashboard.trainingCentersPending'),
        count: s.trainingCentersPending,
        route: this.routes.ADMIN.TRAINING_CENTERS,
        queryParams: { status: 'pending' },
        tone: 'warning',
      },
      {
        label: this.i18n.translate('admin.dashboard.privateInstitutionsPending'),
        count: s.privateInstitutionsPending,
        route: this.routes.ADMIN.PRIVATE_INSTITUTIONS,
        queryParams: { status: 'pending' },
        tone: 'warning',
      },
      {
        label: this.i18n.translate('admin.dashboard.bannedUsersReview'),
        count: s.bannedUsers,
        route: this.routes.ADMIN.USERS,
        queryParams: { banned: 'true' },
        tone: 'danger',
      },
    ].filter((item) => item.count > 0);
  });

  readonly platformHealth = computed(() => {
    this.i18n.language();
    const s = this.stats();
    if (!s) return [];
    return [
      {
        label: this.i18n.translate('admin.dashboard.applicationJobRatio'),
        value: s.jobsTotal ? Math.round((s.applicationsTotal / s.jobsTotal) * 10) / 10 : 0,
        unit: this.i18n.translate('admin.dashboard.applicationsPerJob'),
      },
      {
        label: this.i18n.translate('admin.dashboard.recruitingCompanies'),
        value: s.companiesTotal,
        unit: this.i18n.translate('admin.dashboard.companiesUnit'),
      },
      {
        label: this.i18n.translate('admin.dashboard.catalogToModerate'),
        value: s.trainingCentersPending + s.privateInstitutionsPending,
        unit: this.i18n.translate('admin.dashboard.itemsUnit'),
      },
    ];
  });

  ngOnInit(): void {
    this.loadSubscriptionPolicy();
    this.adminService.getStats().subscribe({
      next: (res) => {
        this.stats.set(res.data || null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadSubscriptionPolicy(): void {
    this.policyLoading.set(true);
    this.adminService.getSubscriptionPolicy().subscribe({
      next: (res) => {
        this.subscriptionPolicy.set(res.data ?? null);
        this.policyLoading.set(false);
      },
      error: () => this.policyLoading.set(false),
    });
  }

  policyLabel(mode: AdminSubscriptionPolicy['mode'] | undefined): string {
    return mode === 'free_all'
      ? this.i18n.translate('admin.companies.freeForAll')
      : this.i18n.translate('admin.companies.paymentRequired');
  }

  async setGlobalPolicy(mode: AdminSubscriptionPolicy['mode']): Promise<void> {
    if (this.subscriptionPolicy()?.mode === mode || this.policyLoading()) return;
    const ok = await this.confirmDialog.confirm({
      title:
        mode === 'free_all'
          ? this.i18n.translate('admin.companies.confirmFreeTitle')
          : this.i18n.translate('admin.companies.confirmPaidTitle'),
      message:
        mode === 'free_all'
          ? this.i18n.translate('admin.companies.confirmFreeMessage')
          : this.i18n.translate('admin.companies.confirmPaidMessage'),
      confirmLabel:
        mode === 'free_all'
          ? this.i18n.translate('admin.companies.activateFreeGlobal')
          : this.i18n.translate('admin.companies.returnToPayment'),
      confirmDanger: mode === 'paid_required',
    });
    if (!ok) return;

    this.policyLoading.set(true);
    this.policyMessage.set(null);
    this.policyError.set(null);
    this.adminService.updateSubscriptionPolicy(mode).subscribe({
      next: () => {
        this.policyMessage.set(
          mode === 'free_all'
            ? this.i18n.translate('admin.companies.freeModeActivated')
            : this.i18n.translate('admin.companies.paidModeActivated')
        );
        this.loadSubscriptionPolicy();
      },
      error: (err: HttpErrorResponse) => {
        this.policyError.set(err.error?.message || this.i18n.translate('admin.companies.policyUpdateError'));
        this.policyLoading.set(false);
      },
    });
  }
}
