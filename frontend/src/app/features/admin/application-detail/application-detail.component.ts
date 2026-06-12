import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminApplicationDetail } from '../../../core/models/admin.model';
import {
  APPLICATION_STATUS_LABELS,
  ApplicationStatus,
} from '../../../core/constants/application-status.constant';
import { JOB_STATUS_LABELS, JobStatus } from '../../../core/constants/job.constant';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'app-admin-application-detail',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './application-detail.component.html',
  styleUrl: './application-detail.component.css',
})
export class ApplicationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);

  readonly routes = APP_ROUTES;
  readonly application = signal<AdminApplicationDetail | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Candidature introuvable.');
      this.loading.set(false);
      return;
    }
    this.adminService.getApplication(id).subscribe({
      next: (res) => {
        this.application.set(res.data ?? null);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Impossible de charger cette candidature.');
        this.loading.set(false);
      },
    });
  }

  applicationStatusLabel(status: string): string {
    return APPLICATION_STATUS_LABELS[status as ApplicationStatus] ?? status;
  }

  jobStatusLabel(status: string): string {
    return JOB_STATUS_LABELS[status as JobStatus] ?? status;
  }
}
