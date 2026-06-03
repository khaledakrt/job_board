import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Job } from '../../../core/models/job.model';
import { PublicCompanyProfile } from '../../../core/models/public-company.model';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { PublicCompanyService } from '../services/public-company.service';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import { remoteLabel, salaryDisplayLabel } from '../../../core/utils/job-display.util';
import { SafeHtmlComponent } from '../../../shared/components/safe-html/safe-html.component';
import {
  COMPANY_SIZES,
  LEGAL_FORMS,
} from '../../recruiter/company-onboarding/company-onboarding.constants';

@Component({
  selector: 'app-public-company-page',
  standalone: true,
  imports: [RouterLink, SafeHtmlComponent],
  templateUrl: './public-company-page.component.html',
  styleUrl: './public-company-page.component.css',
})
export class PublicCompanyPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly companyService = inject(PublicCompanyService);

  readonly routes = APP_ROUTES;

  readonly company = signal<PublicCompanyProfile | null>(null);
  readonly jobs = signal<Job[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly totalJobs = signal(0);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Entreprise introuvable.');
      this.loading.set(false);
      return;
    }

    this.companyService.getPublicProfile(id).subscribe({
      next: (res) => {
        const data = res.data;
        if (!data?.company) {
          this.error.set('Cette entreprise n’existe pas.');
          this.loading.set(false);
          return;
        }
        this.company.set(data.company);
        this.jobs.set(data.jobs ?? []);
        this.totalJobs.set(data.pagination?.totalItems ?? data.jobs?.length ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger cette entreprise.');
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

  formatLegalForm(value: string | null | undefined): string | null {
    if (!value) return null;
    const match = LEGAL_FORMS.find((f) => f.value === value);
    return match && match.value ? match.label : value;
  }

  formatSiret(value: string | null | undefined): string | null {
    if (!value) return null;
    const digits = value.replace(/\s/g, '');
    if (digits.length !== 14) return value;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
}
