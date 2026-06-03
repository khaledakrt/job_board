import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Job } from '../../../core/models/job.model';
import { RecruiterJobService } from '../services/job.service';
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

  readonly jobs = signal<Job[]>([]);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(): void {
    this.loading.set(true);
    this.jobService.list({ page: 1, limit: 100 }).subscribe({
      next: (res) => {
        this.jobs.set(res.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
