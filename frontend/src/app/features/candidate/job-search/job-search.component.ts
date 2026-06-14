import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Job } from '../../../core/models/job.model';
import {
  PublicJobQuiz,
  QuizAnswerPayload,
} from '../../../core/models/job-quiz.model';
import { CONTRACT_TYPES, REMOTE_TYPES, REMOTE_TYPE_LABELS } from '../../../core/constants/job.constant';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import {
  experienceDisplayLabel,
  remoteLabel,
  salaryDisplayLabel,
} from '../../../core/utils/job-display.util';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { CandidateApplicationsService } from '../services/candidate-applications.service';
import {
  DEFAULT_JOB_SEARCH_FILTERS,
  ExperienceFilter,
  JobSearchFilters,
} from '../../../core/models/job-filters.model';
import { CandidateJobService, JobSearchParams } from '../services/candidate-job.service';
import { CandidateContextService } from '../services/candidate-context.service';
import { SavedJobService } from '../services/saved-job.service';
import { JobAlertService } from '../services/job-alert.service';
import {
  CandidateJobsViewMode,
  CandidateJobViewModeService,
} from '../services/candidate-job-view-mode.service';
import { SafeHtmlComponent } from '../../../shared/components/safe-html/safe-html.component';
import { stripHtml } from '../../../shared/utils/rich-text.util';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-job-search',
  standalone: true,
  imports: [ReactiveFormsModule, SafeHtmlComponent, NgTemplateOutlet, RouterLink, TranslatePipe],
  templateUrl: './job-search.component.html',
  styleUrl: './job-search.component.css',
})
export class JobSearchComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly applicationsService = inject(CandidateApplicationsService);
  private readonly jobService = inject(CandidateJobService);
  private readonly savedJobService = inject(SavedJobService);
  private readonly alertService = inject(JobAlertService);
  private readonly viewModeService = inject(CandidateJobViewModeService);
  readonly candidateContext = inject(CandidateContextService);

  private readonly detailDialog = viewChild<ElementRef<HTMLDialogElement>>('detailDialog');
  private lastHandledQueryKey = '';

  readonly contractTypes = CONTRACT_TYPES;
  readonly remoteTypes = REMOTE_TYPES;
  readonly remoteLabels = REMOTE_TYPE_LABELS;
  readonly experienceOptions: { value: ExperienceFilter; labelKey: string }[] = [
    { value: 'all', labelKey: 'jobs.experience.all' },
    { value: 'junior', labelKey: 'jobs.experience.junior' },
    { value: 'mid', labelKey: 'jobs.experience.mid' },
    { value: 'senior', labelKey: 'jobs.experience.senior' },
  ];

  readonly filters = signal<JobSearchFilters>({ ...DEFAULT_JOB_SEARCH_FILTERS });
  readonly appliedFilters = signal<JobSearchFilters>({ ...DEFAULT_JOB_SEARCH_FILTERS });

  readonly allJobs = signal<Job[]>([]);
  readonly selectedJob = signal<Job | null>(null);
  readonly loading = signal(false);
  /** Offre en cours de candidature (popup, indépendante du panneau droit). */
  readonly applyJob = signal<Job | null>(null);
  /** Popup candidature (une seule à la fois). */
  readonly applyFlowOpen = signal(false);
  readonly applyFlowStep = signal<'offer' | 'letter'>('offer');
  readonly applying = signal(false);
  readonly generatingLetter = signal(false);
  readonly savedJobIds = signal<Set<string>>(new Set());
  readonly appliedJobIds = signal<Set<string>>(new Set());
  /** questionIndex -> selected choiceIndex */
  readonly quizSelections = signal<Record<number, number>>({});
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly viewMode = this.viewModeService.mode;
  readonly cardsDetailOpen = signal(false);
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly totalJobs = signal(0);

  readonly applyForm = this.fb.nonNullable.group({
    coverLetter: [''],
  });

  readonly filteredJobs = computed(() => this.allJobs());

  /** Offre pour laquelle quizSelections est valide (réinitialisé au changement d’offre). */
  private activeQuizJobId: string | null = null;

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
      f.quizOnly ||
      f.minSalary != null ||
      f.sortBy !== 'date'
    );
  });

  readonly advancedFiltersOpen = signal(false);

  readonly activeFiltersCount = computed(() => {
    const f = this.appliedFilters();
    let count = 0;
    if (f.keywords.trim()) count += 1;
    if (f.location.trim()) count += 1;
    if (f.company.trim()) count += 1;
    if (f.industry.trim()) count += 1;
    if (f.contracts.length) count += 1;
    if (f.remotes.length) count += 1;
    if (f.experience !== 'all') count += 1;
    if (f.quizOnly) count += 1;
    if (f.sortBy !== 'date') count += 1;
    return count;
  });

  readonly hasAdvancedFilters = computed(() => {
    const f = this.appliedFilters();
    return (
      !!f.company.trim() ||
      !!f.industry.trim() ||
      f.contracts.length > 0 ||
      f.remotes.length > 0 ||
      f.experience !== 'all' ||
      f.quizOnly ||
      f.sortBy !== 'date'
    );
  });

  readonly showAdvancedFilters = computed(
    () => this.advancedFiltersOpen() || this.hasAdvancedFilters()
  );

  constructor() {
    effect(() => {
      if (this.viewMode() !== 'linkedin') {
        return;
      }
      const list = this.filteredJobs();
      const selected = this.selectedJob();
      if (!selected && list.length) {
        this.selectJob(list[0]);
      } else if (selected && !list.find((j) => j.id === selected.id)) {
        this.selectedJob.set(list[0] || null);
      }
    });
  }

  ngOnInit(): void {
    this.fetchJobs();
    this.route.queryParamMap.subscribe(() => this.syncFromQueryParams());
    this.savedJobService.list().subscribe({
      next: (res) => {
        const ids = new Set((res.data || []).map((s) => s.jobId));
        this.savedJobIds.set(ids);
      },
    });
    this.applicationsService.listAppliedJobIds().subscribe({
      next: (res) => {
        this.appliedJobIds.set(new Set(res.data || []));
      },
    });
  }

  fetchJobs(): void {
    this.loading.set(true);
    this.jobService.search(this.buildApiParams()).subscribe({
      next: (res) => {
        this.allJobs.set(res.data || []);
        const pag = res.pagination;
        if (pag) {
          this.totalPages.set(pag.totalPages || 1);
          this.totalJobs.set(pag.totalItems ?? 0);
          this.currentPage.set(pag.page || 1);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les offres.');
        this.loading.set(false);
      },
    });
  }

  applyFilters(): void {
    this.appliedFilters.set({ ...this.filters() });
    this.currentPage.set(1);
    this.fetchJobs();
  }

  resetFilters(): void {
    this.filters.set({ ...DEFAULT_JOB_SEARCH_FILTERS });
    this.appliedFilters.set({ ...DEFAULT_JOB_SEARCH_FILTERS });
    this.currentPage.set(1);
    this.fetchJobs();
  }

  toggleAdvancedFilters(): void {
    this.advancedFiltersOpen.update((open) => !open);
  }

  applyProfileMinSalary(): void {
    const min = this.candidateContext.profile()?.minSalary;
    if (min != null && min > 0) {
      this.filters.update((f) => ({ ...f, minSalary: Number(min) }));
      this.applyFilters();
    }
  }

  updateMinSalary(value: string): void {
    const n = value.trim() === '' ? null : Number(value);
    this.filters.update((f) => ({ ...f, minSalary: n != null && !Number.isNaN(n) ? n : null }));
  }

  setSortBy(value: string): void {
    const sortBy = value === 'salary' || value === 'experience' ? value : 'date';
    this.filters.update((f) => ({ ...f, sortBy }));
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.fetchJobs();
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

  private buildApiParams(): JobSearchParams {
    const f = this.appliedFilters();
    const params: JobSearchParams = {
      page: this.currentPage(),
      limit: PAGE_SIZE,
      sortBy: f.sortBy,
    };

    if (f.keywords.trim()) params.keywords = f.keywords.trim();
    if (f.location.trim()) params.location = f.location.trim();
    if (f.company.trim()) params.company = f.company.trim();
    if (f.industry.trim()) params.industry = f.industry.trim();
    if (f.contracts.length) params.contracts = f.contracts;
    if (f.remotes.length) params.remotes = f.remotes;
    if (f.experience !== 'all') params.experience = f.experience;
    if (f.quizOnly) params.quizOnly = true;
    if (f.minSalary != null && f.minSalary > 0) params.minSalary = f.minSalary;

    return params;
  }

  setViewMode(mode: CandidateJobsViewMode): void {
    if (this.viewMode() === mode) {
      return;
    }
    this.closeCardsDetail();
    this.closeApplyModal();
    this.viewModeService.setMode(mode);
  }

  selectJob(job: Job, options: { refresh?: boolean } = {}): void {
    if (this.activeQuizJobId !== job.id) {
      this.quizSelections.set({});
      this.activeQuizJobId = job.id;
    }
    this.closeApplyModal();
    this.selectedJob.set(job);
    if (options.refresh === false) {
      return;
    }
    this.jobService.getById(job.id).subscribe({
      next: (res) => {
        if (res.data) {
          this.selectedJob.set(res.data);
          if (this.activeQuizJobId !== res.data.id) {
            this.quizSelections.set({});
            this.activeQuizJobId = res.data.id;
          }
        }
      },
    });
  }

  openCardsJobDetail(job: Job, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.selectJob(job);
    this.cardsDetailOpen.set(true);
    this.openDialogWhenReady(this.detailDialog);
  }

  openCompanyInNewTab(companyId: string, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/entreprises', companyId])
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  closeCardsDetail(): void {
    const dialog = this.detailDialog()?.nativeElement;
    if (dialog?.open) {
      dialog.close();
      return;
    }
    this.cardsDetailOpen.set(false);
  }

  onCardsDetailDialogClick(event: MouseEvent): void {
    if (event.target instanceof HTMLDialogElement) {
      this.closeCardsDetail();
    }
  }

  onCardsDetailDialogClosed(): void {
    if (this.cardsDetailOpen()) {
      this.cardsDetailOpen.set(false);
    }
  }

  closeApplyModal(): void {
    this.applyFlowOpen.set(false);
    this.applyFlowStep.set('offer');
    this.applyJob.set(null);
    this.applyForm.reset({ coverLetter: '' });
  }

  backToOfferQuizStep(): void {
    this.applyFlowStep.set('offer');
    this.applyForm.reset({ coverLetter: '' });
  }

  proceedToLetterStep(): void {
    const job = this.applyJob();
    if (!job) return;
    if (this.isQuizEnabled(job) && !this.isQuizCompleteForJob(job)) {
      this.error.set('Répondez à toutes les questions du quiz avant de continuer.');
      return;
    }
    this.applyFlowStep.set('letter');
    this.applyForm.reset({ coverLetter: '' });
  }

  private startApplyFlow(job: Job, options: { refresh?: boolean } = {}): void {
    this.error.set(null);
    this.closeCardsDetail();

    if (this.hasApplied(job.id)) {
      this.error.set('Vous avez déjà postulé à cette offre.');
      return;
    }

    if (!this.candidateContext.profile()?.resumeUrl) {
      this.error.set(
        'Ajoutez un CV dans Mon profil (étape Identité & CV) avant de postuler.'
      );
      return;
    }

    if (this.activeQuizJobId !== job.id) {
      this.quizSelections.set({});
      this.activeQuizJobId = job.id;
    }

    this.applyJob.set(job);
    this.applyForm.reset({ coverLetter: '' });
    this.applyFlowStep.set(this.isQuizEnabled(job) ? 'offer' : 'letter');
    this.applyFlowOpen.set(true);

    if (options.refresh === false) {
      return;
    }
    this.jobService.getById(job.id).subscribe({
      next: (res) => {
        if (res.data) {
          this.applyJob.set(res.data);
          if (this.activeQuizJobId !== res.data.id) {
            this.quizSelections.set({});
            this.activeQuizJobId = res.data.id;
          }
        }
      },
    });
  }

  canProceedToLetter(job: Job): boolean {
    return !this.isQuizEnabled(job) || this.isQuizCompleteForJob(job);
  }

  publicCompanyLink(companyId: string): string[] {
    return ['/entreprises', companyId];
  }

  openJobInNewTab(job: Job, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/offres', job.id])
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  private clearJobQueryParams(): void {
    if (!this.route.snapshot.queryParamMap.get('jobId')) {
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { jobId: null, apply: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
      state: { skipJobQuerySync: true },
    });
  }

  private syncFromQueryParams(): void {
    const navState =
      (this.router.lastSuccessfulNavigation?.extras?.state as
        | { apply?: boolean; job?: Job; jobId?: string; skipJobQuerySync?: boolean }
        | undefined) ||
      (window.history.state as
        | { apply?: boolean; job?: Job; jobId?: string; skipJobQuerySync?: boolean }
        | undefined);
    if (navState?.skipJobQuerySync) {
      return;
    }
    const queryJobId = this.route.snapshot.queryParamMap.get('jobId');
    const jobId = queryJobId || navState?.jobId || null;
    if (!jobId) {
      this.lastHandledQueryKey = '';
      return;
    }

    const apply = queryJobId
      ? this.route.snapshot.queryParamMap.get('apply') === '1'
      : navState?.apply === true;
    const queryKey = `${jobId}:${apply ? '1' : '0'}`;
    if (queryKey === this.lastHandledQueryKey) {
      return;
    }
    this.lastHandledQueryKey = queryKey;

    const openForJob = (job: Job, options: { refresh?: boolean } = {}) => {
      const inList = this.allJobs().some((j) => j.id === job.id);
      if (!inList) {
        this.allJobs.update((list) => [job, ...list]);
      }
      if (apply) {
        this.selectedJob.set(job);
      } else if (this.viewMode() === 'cards') {
        this.openCardsJobDetail(job);
      } else {
        this.selectJob(job, options);
      }
      if (apply && !this.hasApplied(job.id)) {
        afterNextRender(() => this.startApplyFlow(job, options), { injector: this.injector });
      }
      if (queryJobId) {
        this.clearJobQueryParams();
      }
    };

    if (!queryJobId && navState?.job?.id === jobId) {
      openForJob(navState.job, { refresh: false });
      return;
    }

    const cached = this.allJobs().find((j) => j.id === jobId);
    if (cached) {
      openForJob(cached);
      return;
    }

    this.jobService.getById(jobId).subscribe({
      next: (res) => {
        const job = res.data;
        if (job) {
          openForJob(job);
        }
      },
    });
  }

  publicJobLink(jobId: string): string[] {
    return ['/offres', jobId];
  }

  selectJobFromList(job: Job, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.selectJob(job);
  }

  isQuizCompleteForJob(job: Job): boolean {
    if (!this.isQuizEnabled(job)) {
      return true;
    }
    const quiz = this.jobQuiz(job);
    if (!quiz) {
      return true;
    }
    if (this.activeQuizJobId !== job.id) {
      return false;
    }
    const selections = this.quizSelections();
    return quiz.questions.every((_, index) => selections[index] !== undefined);
  }

  postulerFromDetail(job: Job, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (this.viewMode() === 'cards' && this.selectedJob()?.id !== job.id) {
      this.selectJob(job);
    }
    this.startApplyFlow(job);
  }

  /** Postuler depuis la vue liste (carte gauche) — ne change pas le panneau droit. */
  tryOpenApplyFromList(job: Job, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.startApplyFlow(job);
  }

  private extractApiError(err: HttpErrorResponse): string {
    const body = err.error as { message?: string; errors?: { message?: string }[] } | null;
    if (body?.errors?.length) {
      return body.errors.map((e) => e.message).filter(Boolean).join(' ') || body.message || '';
    }
    return body?.message || '';
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


  generateLetter(): void {
    const job = this.applyJob();
    if (!job || !this.applyFlowOpen()) return;
    this.generatingLetter.set(true);
    this.jobService.generateLetter(job.id).subscribe({
      next: (res) => {
        if (res.data?.fullText) {
          this.applyForm.patchValue({ coverLetter: res.data.fullText });
        }
        this.generatingLetter.set(false);
      },
      error: () => {
        this.error.set('Impossible de générer la lettre de motivation.');
        this.generatingLetter.set(false);
      },
    });
  }

  hasApplied(jobId: string): boolean {
    return this.appliedJobIds().has(jobId);
  }

  isQuizEnabled(job: Job): boolean {
    return Boolean(job.quizEnabled && job.quiz?.questions?.length);
  }

  jobQuiz(job: Job): PublicJobQuiz | null {
    if (!this.isQuizEnabled(job)) return null;
    return job.quiz as PublicJobQuiz;
  }

  selectQuizAnswer(questionIndex: number, choiceIndex: number): void {
    this.quizSelections.update((s) => ({ ...s, [questionIndex]: choiceIndex }));
  }

  quizAnswerFor(questionIndex: number): number | null {
    const v = this.quizSelections()[questionIndex];
    return v === undefined ? null : v;
  }

  private buildQuizAnswers(): QuizAnswerPayload[] | undefined {
    const job = this.applyJob();
    if (!job || !this.isQuizEnabled(job)) return undefined;
    const quiz = this.jobQuiz(job);
    if (!quiz) return undefined;
    return quiz.questions.map((_, i) => ({
      questionIndex: i,
      choiceIndex: this.quizSelections()[i] ?? -1,
    }));
  }

  private validateQuizBeforeApply(): string | null {
    const job = this.applyJob();
    if (!job || !this.isQuizEnabled(job)) return null;
    const quiz = this.jobQuiz(job);
    if (!quiz) return null;
    for (let i = 0; i < quiz.questions.length; i += 1) {
      if (this.quizSelections()[i] === undefined) {
        return `Répondez à la question ${i + 1} du quiz avant d’envoyer votre candidature.`;
      }
    }
    return null;
  }

  async submitApplication(): Promise<void> {
    const job = this.applyJob();
    if (!job || !this.applyFlowOpen()) return;

    const quizError = this.validateQuizBeforeApply();
    if (quizError) {
      this.error.set(quizError);
      return;
    }

    const ok = await this.confirmDialog.confirm({
      title: 'Envoyer la candidature',
      message: `Envoyer votre candidature pour « ${job.title} » ?`,
      confirmLabel: 'Envoyer',
    });
    if (!ok) return;

    this.applying.set(true);
    const quizAnswers = this.buildQuizAnswers();
    const letter = this.applyForm.controls.coverLetter.value?.trim();
    const payload: { coverLetter?: string; quizAnswers?: QuizAnswerPayload[] } = {};
    if (letter) {
      payload.coverLetter = letter;
    }
    if (quizAnswers?.length) {
      payload.quizAnswers = quizAnswers;
    }

    this.jobService.apply(job.id, payload)
      .subscribe({
        next: () => {
          this.appliedJobIds.update((s) => new Set(s).add(job.id));
          this.success.set('Candidature envoyée avec succès.');
          this.applying.set(false);
          this.closeApplyModal();
        },
        error: (err: HttpErrorResponse) => {
          const msg = this.extractApiError(err);
          if (err.status === 409) {
            this.error.set('Vous avez déjà postulé à cette offre.');
            this.appliedJobIds.update((s) => new Set(s).add(job.id));
          } else {
            this.error.set(msg || 'Échec de l’envoi de la candidature.');
          }
          this.applying.set(false);
        },
      });
  }

  async saveJob(job: Job, event?: Event): Promise<void> {
    event?.stopPropagation();
    event?.preventDefault();
    if (!this.isSaved(job.id) && this.savedJobIds().size >= 10) {
      this.success.set(null);
      this.error.set('Vous ne pouvez pas enregistrer plus de 10 offres. Retirez une offre pour en ajouter une autre.');
      return;
    }

    const ok = await this.confirmDialog.confirm({
      title: 'Enregistrer l\'offre',
      message: `Enregistrer « ${job.title} » dans vos offres sauvegardées ?`,
      confirmLabel: 'Enregistrer',
    });
    if (!ok) return;

    this.savedJobService.save(job.id).subscribe({
      next: () => {
        this.savedJobIds.update((s) => new Set(s).add(job.id));
        this.success.set('Offre enregistrée.');
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'Impossible d\'enregistrer l\'offre.');
      },
    });
  }

  async createAlert(): Promise<void> {
    const searchFilters = { ...this.filters() };
    if (!this.hasMeaningfulAlertFilters(searchFilters)) {
      this.error.set('Remplissez au moins un champ de recherche avant de créer une alerte.');
      this.success.set(null);
      return;
    }

    const ok = await this.confirmDialog.confirm({
      title: 'Créer une alerte',
      message: 'Créer une alerte emploi avec les critères renseignés ?',
      confirmLabel: 'Créer',
    });
    if (!ok) return;

    this.alertService
      .create({ searchFilters: searchFilters as Record<string, unknown> })
      .subscribe({
      next: () => this.success.set('Alerte emploi créée avec les critères renseignés.'),
      error: (err: HttpErrorResponse) =>
        this.error.set(err.error?.message || 'Impossible de créer l\'alerte.'),
    });
  }

  private hasMeaningfulAlertFilters(filters: JobSearchFilters): boolean {
    return (
      !!filters.keywords.trim() ||
      !!filters.location.trim() ||
      !!filters.company.trim() ||
      !!filters.industry.trim() ||
      filters.contracts.length > 0 ||
      filters.remotes.length > 0 ||
      filters.experience !== 'all' ||
      filters.quizOnly ||
      (filters.minSalary != null && filters.minSalary > 0)
    );
  }

  isSaved(jobId: string): boolean {
    return this.savedJobIds().has(jobId);
  }

  companyLogo(job: Job): string | null {
    return resolveUploadUrl(job.company?.logoUrl ?? null);
  }

  formatRemote(type: string | undefined): string {
    return remoteLabel(type);
  }

  formatSalary(job: Job): string | null {
    return salaryDisplayLabel(job);
  }

  formatExperience(job: Job): string | null {
    return experienceDisplayLabel(job);
  }
}
