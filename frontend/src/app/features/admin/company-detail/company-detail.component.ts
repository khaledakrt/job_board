import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminCompanyDetail } from '../../../core/models/admin.model';
import { JOB_STATUS_LABELS, JobStatus } from '../../../core/constants/job.constant';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'app-admin-company-detail',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './company-detail.component.html',
  styleUrl: './company-detail.component.css',
})
export class CompanyDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);

  readonly routes = APP_ROUTES;
  readonly company = signal<AdminCompanyDetail | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Entreprise introuvable.');
      this.loading.set(false);
      return;
    }
    this.adminService.getCompany(id).subscribe({
      next: (res) => {
        this.company.set(res.data ?? null);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Impossible de charger cette entreprise.');
        this.loading.set(false);
      },
    });
  }

  jobStatusLabel(status: string): string {
    return JOB_STATUS_LABELS[status as JobStatus] ?? status;
  }
}
