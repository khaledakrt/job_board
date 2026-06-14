import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { AdminStats } from '../../../core/models/admin.model';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';

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
  readonly routes = APP_ROUTES;

  readonly stats = signal<AdminStats | null>(null);
  readonly loading = signal(true);

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
    this.adminService.getStats().subscribe({
      next: (res) => {
        this.stats.set(res.data || null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
