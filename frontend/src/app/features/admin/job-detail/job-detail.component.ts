import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminJobDetail } from '../../../core/models/admin.model';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { JOB_STATUS_LABELS, JobStatus } from '../../../core/constants/job.constant';
import {
  APPLICATION_STATUS_LABELS,
  ApplicationStatus,
} from '../../../core/constants/application-status.constant';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'app-admin-job-detail',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './job-detail.component.html',
  styleUrl: './job-detail.component.css',
})
export class JobDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);

  readonly routes = APP_ROUTES;
  readonly jobStatusLabels = JOB_STATUS_LABELS;
  readonly applicationStatusLabels = APPLICATION_STATUS_LABELS;
  readonly job = signal<AdminJobDetail | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Offre introuvable.');
      this.loading.set(false);
      return;
    }
    this.adminService.getJob(id).subscribe({
      next: (res) => {
        this.job.set(res.data ?? null);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Impossible de charger cette offre.');
        this.loading.set(false);
      },
    });
  }

  jobStatusLabel(status: string): string {
    return JOB_STATUS_LABELS[status as JobStatus] ?? status;
  }

  applicationStatusLabel(status: string): string {
    return APPLICATION_STATUS_LABELS[status as ApplicationStatus] ?? status;
  }
}
