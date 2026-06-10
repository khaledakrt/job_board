import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RecruiterJobService } from '../services/job.service';
import { Job } from '../../../core/models/job.model';
import {
  JOB_STATUS_HINTS,
  JOB_STATUS_LABELS,
  JobStatus,
  isJobPubliclyVisible,
} from '../../../core/constants/job.constant';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import {
  experienceDisplayLabel,
  remoteLabel,
  salaryDisplayLabel,
} from '../../../core/utils/job-display.util';
import { SafeHtmlComponent } from '../../../shared/components/safe-html/safe-html.component';
import { RecruiterContextService } from '../services/recruiter-context.service';

@Component({
  selector: 'app-job-preview',
  standalone: true,
  imports: [RouterLink, DatePipe, SafeHtmlComponent],
  templateUrl: './job-preview.component.html',
  styleUrl: './job-preview.component.css',
})
export class JobPreviewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly jobService = inject(RecruiterJobService);
  readonly context = inject(RecruiterContextService);

  readonly statusLabels = JOB_STATUS_LABELS;
  readonly statusHints = JOB_STATUS_HINTS;
  readonly routes = APP_ROUTES;

  readonly job = signal<Job | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Offre introuvable.');
      this.loading.set(false);
      return;
    }
    this.jobService.getById(id).subscribe({
      next: (res) => {
        this.job.set(res.data || null);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger cette offre.');
        this.loading.set(false);
      },
    });
  }

  companyLogo(job: Job): string | null {
    return resolveUploadUrl(job.company?.logoUrl ?? null);
  }

  formatRemote(type: string): string {
    return remoteLabel(type);
  }

  formatSalary(job: Job): string | null {
    return salaryDisplayLabel(job);
  }

  formatExperience(job: Job): string | null {
    return experienceDisplayLabel(job);
  }

  statusBadgeClass(status: JobStatus): string {
    return `badge badge-${status}`;
  }

  visibilityNote(status: JobStatus): string {
    return isJobPubliclyVisible(status)
      ? 'Les candidats voient cette offre dans la recherche.'
      : this.statusHints[status];
  }
}
