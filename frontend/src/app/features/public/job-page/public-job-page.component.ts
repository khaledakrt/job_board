import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { USER_ROLES } from '../../../core/constants/roles.constant';
import { Job } from '../../../core/models/job.model';
import { PublicJobQuiz } from '../../../core/models/job-quiz.model';
import { CandidateJobService } from '../../candidate/services/candidate-job.service';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import {
  experienceDisplayLabel,
  remoteLabel,
  salaryDisplayLabel,
} from '../../../core/utils/job-display.util';
import { SafeHtmlComponent } from '../../../shared/components/safe-html/safe-html.component';

@Component({
  selector: 'app-public-job-page',
  standalone: true,
  imports: [RouterLink, SafeHtmlComponent],
  templateUrl: './public-job-page.component.html',
  styleUrl: './public-job-page.component.css',
})
export class PublicJobPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly jobService = inject(CandidateJobService);
  private readonly authService = inject(AuthService);

  readonly routes = APP_ROUTES;

  readonly selectedJob = signal<Job | null>(null);
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
        this.selectedJob.set(res.data ?? null);
        if (!res.data) {
          this.error.set('Cette offre n’existe pas ou n’est plus disponible.');
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger cette offre.');
        this.loading.set(false);
      },
    });
  }

  companyLogo(job: Job): string | null {
    const url = job.company?.logoUrl;
    return url ? resolveUploadUrl(url) : null;
  }

  publicCompanyLink(companyId: string): string[] {
    return ['/entreprises', companyId];
  }

  formatRemote(remoteType: string): string {
    return remoteLabel(remoteType);
  }

  formatSalary(job: Job): string | null {
    return salaryDisplayLabel(job);
  }

  formatExperience(job: Job): string | null {
    return experienceDisplayLabel(job);
  }

  isQuizEnabled(job: Job): boolean {
    return Boolean(job.quizEnabled);
  }

  getJobQuiz(job: Job): PublicJobQuiz | null {
    if (!job.quiz) return null;
    return job.quiz as PublicJobQuiz;
  }

  async onApply(): Promise<void> {
    const job = this.selectedJob();
    if (!job) return;

    if (!this.authService.isAuthenticated()) {
      await this.router.navigate([APP_ROUTES.AUTH.LOGIN], {
        queryParams: { returnUrl: APP_ROUTES.PUBLIC.JOB(job.id) },
      });
      return;
    }

    if (this.authService.user()?.role === USER_ROLES.CANDIDATE) {
      await this.router.navigate([APP_ROUTES.CANDIDATE.JOBS], {
        queryParams: { jobId: job.id, apply: '1' },
      });
      return;
    }

    await this.router.navigate([APP_ROUTES.AUTH.LOGIN]);
  }
}
