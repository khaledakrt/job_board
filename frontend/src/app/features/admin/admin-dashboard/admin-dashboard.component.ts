import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { AdminStats } from '../../../core/models/admin.model';
import { APP_ROUTES } from '../../../core/constants/routes.constant';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  readonly routes = APP_ROUTES;

  readonly stats = signal<AdminStats | null>(null);
  readonly loading = signal(true);

  readonly moderationQueue = computed(() => {
    const s = this.stats();
    if (!s) return [];
    return [
      {
        label: 'Centres de formation à valider',
        count: s.trainingCentersPending,
        route: this.routes.ADMIN.TRAINING_CENTERS,
        queryParams: { status: 'pending' },
        tone: 'warning',
      },
      {
        label: 'Établissements privés à valider',
        count: s.privateInstitutionsPending,
        route: this.routes.ADMIN.PRIVATE_INSTITUTIONS,
        queryParams: { status: 'pending' },
        tone: 'warning',
      },
      {
        label: 'Comptes bannis à revoir',
        count: s.bannedUsers,
        route: this.routes.ADMIN.USERS,
        queryParams: { banned: 'true' },
        tone: 'danger',
      },
    ].filter((item) => item.count > 0);
  });

  readonly platformHealth = computed(() => {
    const s = this.stats();
    if (!s) return [];
    return [
      {
        label: 'Ratio candidatures / offres',
        value: s.jobsTotal ? Math.round((s.applicationsTotal / s.jobsTotal) * 10) / 10 : 0,
        unit: 'cand./offre',
      },
      {
        label: 'Entreprises recruteuses',
        value: s.companiesTotal,
        unit: 'entreprises',
      },
      {
        label: 'Catalogue à modérer',
        value: s.trainingCentersPending + s.privateInstitutionsPending,
        unit: 'éléments',
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
