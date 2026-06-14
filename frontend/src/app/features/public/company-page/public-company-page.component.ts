import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Job } from '../../../core/models/job.model';
import { PublicCompanyProfile } from '../../../core/models/public-company.model';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { PublicCompanyService } from '../services/public-company.service';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import { remoteLabel, salaryDisplayLabel } from '../../../core/utils/job-display.util';
import { SafeHtmlComponent } from '../../../shared/components/safe-html/safe-html.component';
import { COMPANY_SIZES } from '../../recruiter/company-onboarding/company-onboarding.constants';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-public-company-page',
  standalone: true,
  imports: [RouterLink, SafeHtmlComponent, TranslatePipe],
  templateUrl: './public-company-page.component.html',
  styleUrl: './public-company-page.component.css',
})
export class PublicCompanyPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly companyService = inject(PublicCompanyService);
  private readonly i18n = inject(I18nService);

  readonly routes = APP_ROUTES;

  readonly company = signal<PublicCompanyProfile | null>(null);
  readonly jobs = signal<Job[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly totalJobs = signal(0);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set(this.i18n.translate('public.company.notFound'));
      this.loading.set(false);
      return;
    }

    this.companyService.getPublicProfile(id).subscribe({
      next: (res) => {
        const data = res.data;
        if (!data?.company) {
          this.error.set(this.i18n.translate('public.company.unavailable'));
          this.loading.set(false);
          return;
        }
        this.company.set(data.company);
        this.jobs.set(data.jobs ?? []);
        this.totalJobs.set(data.pagination?.totalItems ?? data.jobs?.length ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.i18n.translate('public.company.loadError'));
        this.loading.set(false);
      },
    });
  }

  companyLogo(): string | null {
    const url = this.company()?.logoUrl;
    return url ? resolveUploadUrl(url) : null;
  }

  publicJobLink(id: string): string[] {
    return ['/offres', id];
  }

  formatRemote(remoteType: string): string {
    return remoteLabel(remoteType);
  }

  formatSalary(job: Job): string | null {
    return salaryDisplayLabel(job);
  }

  isQuizEnabled(job: Job): boolean {
    return Boolean(job.quizEnabled);
  }

  formatScaleSize(value: string | null | undefined): string | null {
    if (!value) return null;
    const match = COMPANY_SIZES.find((s) => s.value === value);
    return match && match.value ? match.label : value;
  }

  jobsCountLabel(count: number): string {
    return count > 1 ? this.i18n.translate('public.company.jobsOnlinePlural') : this.i18n.translate('public.company.jobsOnlineSingular');
  }

}
