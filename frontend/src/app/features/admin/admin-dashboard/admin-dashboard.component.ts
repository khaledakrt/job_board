import { Component, inject, OnInit, signal } from '@angular/core';
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
