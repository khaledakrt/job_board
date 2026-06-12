import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { APP_ROUTES } from '../../../../core/constants/routes.constant';
import { USER_ROLES } from '../../../../core/constants/roles.constant';
import {
  CONTRACT_TYPES,
  REMOTE_TYPES,
  REMOTE_TYPE_LABELS,
} from '../../../../core/constants/job.constant';
import { Job } from '../../../../core/models/job.model';
import { PublicJobQuiz } from '../../../../core/models/job-quiz.model';
import {
  CandidateJobService,
  JobSearchParams,
} from '../../../candidate/services/candidate-job.service';
import { resolveUploadUrl } from '../../../../core/utils/asset-url.util';
import {
  experienceDisplayLabel,
  remoteLabel,
  salaryDisplayLabel,
} from '../../../../core/utils/job-display.util';
import { SafeHtmlComponent } from '../../../../shared/components/safe-html/safe-html.component';
import {
  DEFAULT_JOB_SEARCH_FILTERS,
  ExperienceFilter,
  JobSearchFilters,
} from '../../../../core/models/job-filters.model';

export type PublicJobFilters = JobSearchFilters;
export type { ExperienceFilter };

interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const PAGE_SIZE_PREVIEW = 6;
const PAGE_SIZE_ALL = 12;

type JobsGridMode = 'landing' | 'catalog';

const DEFAULT_FILTERS: PublicJobFilters = { ...DEFAULT_JOB_SEARCH_FILTERS };

@Component({
  selector: 'app-public-jobs-browse',
  standalone: true,
  imports: [RouterLink, SafeHtmlComponent, NgTemplateOutlet],
  templateUrl: './public-jobs-browse.component.html',
  styleUrl: './public-jobs-browse.component.css',
})
export class PublicJobsBrowseComponent implements OnInit, OnDestroy {
  private readonly jobService = inject(CandidateJobService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  private readonly browseAllDialog = viewChild<ElementRef<HTMLDialogElement>>('browseAllDialog');
  private readonly detailDialog = viewChild<ElementRef<HTMLDialogElement>>('detailDialog');
  private readonly authDialog = viewChild<ElementRef<HTMLDialogElement>>('authDialog');

  readonly routes = APP_ROUTES;
  readonly contractTypes = CONTRACT_TYPES;
  readonly remoteTypes = REMOTE_TYPES;
  readonly remoteLabels = REMOTE_TYPE_LABELS;
  readonly experienceOptions: { value: ExperienceFilter; label: string }[] = [
    { value: 'all', label: 'Toute expérience' },
    { value: 'junior', label: 'Débutant (0–2 ans)' },
    { value: 'mid', label: 'Confirmé (3–5 ans)' },
    { value: 'senior', label: 'Senior (6+ ans)' },
  ];

  readonly filters = signal<PublicJobFilters>({ ...DEFAULT_FILTERS });
  readonly appliedFilters = signal<PublicJobFilters>({ ...DEFAULT_FILTERS });

  readonly previewJobs = signal<Job[]>([]);
  readonly catalogJobs = signal<Job[]>([]);
  readonly allJobsCache = signal<Job[]>([]);
  readonly selectedJob = signal<Job | null>(null);
  readonly detailModalOpen = signal(false);
  readonly browseAllModalOpen = signal(false);
  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly authPromptOpen = signal(false);
  readonly previewPage = signal(1);
  readonly catalogPage = signal(1);
  readonly previewPagination = signal<PaginationMeta | null>(null);
  readonly catalogPagination = signal<PaginationMeta | null>(null);

  readonly displayedPreviewJobs = computed(() => this.displayedJobsFor('landing'));
  readonly displayedCatalogJobs = computed(() => this.displayedJobsFor('catalog'));

  readonly totalItems = computed(() => this.totalItemsFor('landing'));
  readonly catalogTotalItems = computed(() => this.totalItemsFor('catalog'));

  readonly previewTotalPages = computed(() => this.totalPagesFor('landing'));
  readonly catalogTotalPages = computed(() => this.totalPagesFor('catalog'));
  readonly previewPageNumbers = computed(() => this.pageNumbersFor('landing'));
  readonly catalogPageNumbers = computed(() => this.pageNumbersFor('catalog'));

  readonly hasActiveFilters = computed(() => {
    const f = this.appliedFilters();
    return (
      !!f.keywords.trim() ||
      !!f.location.trim() ||
      !!f.company.trim() ||
      !!f.industry.trim() ||
      f.contracts.length > 0 ||
      f.remotes.length > 0 ||
      f.experience !== 'all' ||
      f.quizOnly
    );
  });

  ngOnInit(): void {
    this.fetchJobs('landing');
  }

  openBrowseAll(): void {
    this.browseAllModalOpen.set(true);
    this.catalogPage.set(1);
    this.fetchJobs('catalog');
    this.openDialogWhenReady(this.browseAllDialog);
  }

  closeBrowseAll(): void {
    const dialog = this.browseAllDialog()?.nativeElement;
    if (dialog?.open) {
      dialog.close();
      return;
    }
    if (this.browseAllModalOpen()) {
      this.browseAllModalOpen.set(false);
    }
  }

  onBrowseAllDialogClick(event: MouseEvent): void {
    if (event.target instanceof HTMLDialogElement) {
      this.closeBrowseAll();
    }
  }

  onBrowseAllDialogClosed(): void {
    if (!this.browseAllModalOpen()) {
      return;
    }
    this.browseAllModalOpen.set(false);
    this.catalogPage.set(1);
  }

  onDetailDialogClick(event: MouseEvent): void {
    if (event.target instanceof HTMLDialogElement) {
      this.closeDetailModal();
    }
  }

  onDetailDialogClosed(): void {
    if (!this.detailModalOpen()) {
      return;
    }
    this.detailModalOpen.set(false);
  }

  onAuthDialogClick(event: MouseEvent): void {
    if (event.target instanceof HTMLDialogElement) {
      this.closeAuthPrompt();
    }
  }

  onAuthDialogClosed(): void {
    if (!this.authPromptOpen()) {
      return;
    }
    this.authPromptOpen.set(false);
  }

  applyFilters(): void {
    this.appliedFilters.set({ ...this.filters() });
    this.previewPage.set(1);
    this.catalogPage.set(1);
    this.fetchJobs('both');
  }

  resetFilters(): void {
    this.filters.set({ ...DEFAULT_FILTERS });
    this.appliedFilters.set({ ...DEFAULT_FILTERS });
    this.previewPage.set(1);
    this.catalogPage.set(1);
    this.fetchJobs('both');
  }

  goToPage(page: number, mode: JobsGridMode): void {
    const total = this.totalPagesFor(mode);
    const current = mode === 'catalog' ? this.catalogPage() : this.previewPage();
    if (page < 1 || page > total || page === current) {
      return;
    }
    if (mode === 'catalog') {
      this.catalogPage.set(page);
    } else {
      this.previewPage.set(page);
    }
    this.fetchJobs(mode);
    if (mode === 'landing') {
      this.scrollJobsIntoView();
    }
  }

  updateKeyword(value: string): void {
    this.filters.update((f) => ({ ...f, keywords: value }));
  }

  updateLocation(value: string): void {
    this.filters.update((f) => ({ ...f, location: value }));
  }

  updateCompany(value: string): void {
    this.filters.update((f) => ({ ...f, company: value }));
  }

  updateIndustry(value: string): void {
    this.filters.update((f) => ({ ...f, industry: value }));
  }

  setExperience(value: ExperienceFilter): void {
    this.filters.update((f) => ({ ...f, experience: value }));
  }

  toggleQuizOnly(): void {
    this.filters.update((f) => ({ ...f, quizOnly: !f.quizOnly }));
  }

  toggleContract(type: string): void {
    this.filters.update((f) => {
      const contracts = f.contracts.includes(type)
        ? f.contracts.filter((c) => c !== type)
        : [...f.contracts, type];
      return { ...f, contracts };
    });
  }

  toggleRemote(type: string): void {
    this.filters.update((f) => {
      const remotes = f.remotes.includes(type)
        ? f.remotes.filter((r) => r !== type)
        : [...f.remotes, type];
      return { ...f, remotes };
    });
  }

  publicJobLink(id: string): string[] {
    return ['/offres', id];
  }

  publicCompanyLink(companyId: string): string[] {
    return ['/entreprises', companyId];
  }

  openJobInNewTab(job: Job, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    const url = this.router.serializeUrl(this.router.createUrlTree(this.publicJobLink(job.id)));
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  openJobDetail(job: Job): void {
    this.selectedJob.set(job);
    this.detailModalOpen.set(true);
    this.openDialogWhenReady(this.detailDialog);

    this.jobService.getById(job.id).subscribe({
      next: (res) => {
        if (res.data) {
          this.selectedJob.set(res.data);
        }
      },
    });
  }

  closeDetailModal(): void {
    const dialog = this.detailDialog()?.nativeElement;
    if (dialog?.open) {
      dialog.close();
      return;
    }
    if (this.detailModalOpen()) {
      this.detailModalOpen.set(false);
    }
  }

  companyLogo(job: Job): string | null {
    const url = job.company?.logoUrl;
    return url ? resolveUploadUrl(url) : null;
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

  jobQuiz(job: Job): PublicJobQuiz | null {
    if (!job.quiz) return null;
    return job.quiz as PublicJobQuiz;
  }

  async onApply(): Promise<void> {
    const job = this.selectedJob();
    if (!job) return;

    if (!this.authService.isAuthenticated()) {
      this.openAuthPrompt();
      return;
    }

    if (this.authService.user()?.role === USER_ROLES.CANDIDATE) {
      await this.router.navigate([APP_ROUTES.CANDIDATE.JOBS], {
        queryParams: { jobId: job.id, apply: '1' },
      });
      return;
    }

    this.openAuthPrompt();
  }

  openAuthPrompt(): void {
    this.authPromptOpen.set(true);
    this.openDialogWhenReady(this.authDialog);
  }

  closeAuthPrompt(): void {
    const dialog = this.authDialog()?.nativeElement;
    if (dialog?.open) {
      dialog.close();
      return;
    }
    if (this.authPromptOpen()) {
      this.authPromptOpen.set(false);
    }
  }

  ngOnDestroy(): void {
    this.closeNativeDialog(this.browseAllDialog());
    this.closeNativeDialog(this.detailDialog());
    this.closeNativeDialog(this.authDialog());
    document.body.style.overflow = '';
  }

  private openDialogWhenReady(
    dialogRef: () => ElementRef<HTMLDialogElement> | undefined
  ): void {
    afterNextRender(
      () => {
        const dialog = dialogRef()?.nativeElement;
        if (dialog?.isConnected && !dialog.open) {
          dialog.showModal();
        }
      },
      { injector: this.injector }
    );
  }

  private closeNativeDialog(ref: ElementRef<HTMLDialogElement> | undefined): void {
    const dialog = ref?.nativeElement;
    if (dialog?.open) {
      dialog.close();
    }
  }

  private scrollJobsIntoView(): void {
    document.getElementById('offres')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private pageSizeFor(mode: JobsGridMode): number {
    return mode === 'catalog' ? PAGE_SIZE_ALL : PAGE_SIZE_PREVIEW;
  }

  private displayedJobsFor(mode: JobsGridMode): Job[] {
    return mode === 'catalog' ? this.catalogJobs() : this.previewJobs();
  }

  private totalItemsFor(mode: JobsGridMode): number {
    const pagination =
      mode === 'catalog' ? this.catalogPagination() : this.previewPagination();
    const jobs = mode === 'catalog' ? this.catalogJobs() : this.previewJobs();
    return pagination?.totalItems ?? jobs.length;
  }

  private totalPagesFor(mode: JobsGridMode): number {
    const pagination =
      mode === 'catalog' ? this.catalogPagination() : this.previewPagination();
    return pagination?.totalPages ?? 1;
  }

  private pageNumbersFor(mode: JobsGridMode): number[] {
    const total = this.totalPagesFor(mode);
    const current = mode === 'catalog' ? this.catalogPage() : this.previewPage();
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let p = start; p <= end; p += 1) {
      pages.push(p);
    }
    return pages;
  }

  private buildApiParams(mode: JobsGridMode): JobSearchParams {
    const f = this.appliedFilters();
    const params: JobSearchParams = {
      page: mode === 'catalog' ? this.catalogPage() : this.previewPage(),
      limit: this.pageSizeFor(mode),
    };

    if (f.keywords.trim()) params.keywords = f.keywords.trim();
    if (f.location.trim()) params.location = f.location.trim();
    if (f.company.trim()) params.company = f.company.trim();
    if (f.industry.trim()) params.industry = f.industry.trim();
    if (f.contracts.length === 1) {
      params.contractType = f.contracts[0];
    } else if (f.contracts.length > 1) {
      params.contracts = f.contracts;
    }
    if (f.remotes.length === 1) {
      params.remoteType = f.remotes[0];
    } else if (f.remotes.length > 1) {
      params.remotes = f.remotes;
    }
    if (f.experience !== 'all') params.experience = f.experience;
    if (f.quizOnly) params.quizOnly = true;

    return params;
  }

  private applyServerResponse(mode: JobsGridMode, response: {
    data?: Job[];
    pagination?: PaginationMeta;
  }): void {
    const items = response.data ?? [];
    const fallbackPage = mode === 'catalog' ? this.catalogPage() : this.previewPage();
    const fallbackLimit = this.pageSizeFor(mode);
    const meta =
      response.pagination ??
      ({
        page: fallbackPage,
        limit: fallbackLimit,
        totalItems: items.length,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      } as PaginationMeta);

    if (mode === 'catalog') {
      this.catalogJobs.set(items);
      this.catalogPagination.set(meta);
    } else {
      this.previewJobs.set(items);
      this.previewPagination.set(meta);
    }
  }

  private fetchJobs(target: 'landing' | 'catalog' | 'both' = 'both'): void {
    this.loading.set(true);
    this.loadError.set(false);

    if (target === 'both') {
      forkJoin([
        this.jobService.search(this.buildApiParams('landing')),
        this.jobService.search(this.buildApiParams('catalog')),
      ]).subscribe({
        next: ([previewRes, catalogRes]) => {
          this.allJobsCache.set([]);
          this.applyServerResponse('landing', previewRes);
          this.applyServerResponse('catalog', catalogRes);
        },
        error: (err: HttpErrorResponse) => {
          this.handleFetchError(err);
        },
        complete: () => this.loading.set(false),
      });
      return;
    }

    const mode: JobsGridMode = target === 'catalog' ? 'catalog' : 'landing';
    this.jobService.search(this.buildApiParams(mode)).subscribe({
      next: (response) => {
        this.allJobsCache.set([]);
        this.applyServerResponse(mode, response);
      },
      error: (err: HttpErrorResponse) => {
        this.handleFetchError(err);
      },
      complete: () => this.loading.set(false),
    });
  }

  private handleFetchError(err: HttpErrorResponse): void {
    this.loadError.set(true);
    this.previewJobs.set([]);
    this.catalogJobs.set([]);
    this.previewPagination.set(null);
    this.catalogPagination.set(null);
  }
}
