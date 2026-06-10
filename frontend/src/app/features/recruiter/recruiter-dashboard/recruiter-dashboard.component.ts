import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RecruiterAnalyticsSummary, RecruiterJobService } from '../services/job.service';
import { RecruiterContextService } from '../services/recruiter-context.service';
import { AnalyticsGridComponent } from '../analytics-grid/analytics-grid.component';
import { APP_ROUTES } from '../../../core/constants/routes.constant';

@Component({
  selector: 'app-recruiter-dashboard',
  standalone: true,
  imports: [AnalyticsGridComponent, RouterLink],
  templateUrl: './recruiter-dashboard.component.html',
  styleUrl: './recruiter-dashboard.component.css',
})
export class RecruiterDashboardComponent implements OnInit {
  private readonly jobService = inject(RecruiterJobService);
  readonly context = inject(RecruiterContextService);
  readonly routes = APP_ROUTES;

  readonly summary = signal<RecruiterAnalyticsSummary | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.jobService.summary().subscribe({
      next: (res) => {
        this.summary.set(res.data || null);
        this.loading.set(false);
      },
      error: () => {
        this.summary.set(null);
        this.errorMessage.set('Impossible de charger les indicateurs recruteur.');
        this.loading.set(false);
      },
    });
  }
}
