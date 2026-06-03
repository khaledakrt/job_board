import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { Job } from '../../../core/models/job.model';

export interface AnalyticsSummary {
  totalJobs: number;
  totalViews: number;
  totalApplicants: number;
  activeJobs: number;
}

@Component({
  selector: 'app-analytics-grid',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './analytics-grid.component.html',
  styleUrl: './analytics-grid.component.css',
})
export class AnalyticsGridComponent {
  readonly jobs = input<Job[]>([]);

  readonly summary = computed<AnalyticsSummary>(() => {
    const list = this.jobs();
    return {
      totalJobs: list.length,
      totalViews: list.reduce((sum, job) => sum + (job.viewsCount || 0), 0),
      totalApplicants: list.reduce((sum, job) => sum + (job.applicationsCount || 0), 0),
      activeJobs: list.filter((job) => job.status === 'active').length,
    };
  });
}
