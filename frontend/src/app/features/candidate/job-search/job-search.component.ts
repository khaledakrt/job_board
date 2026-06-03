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
import { SafeHtmlComponent } from '../../../shared/components/safe-html/safe-html.component';
import { stripHtml } from '../../../shared/utils/rich-text.util';

export type CandidateJobsViewMode = 'linkedin' | 'cards';

const API_MAX_LIMIT = 50;

@Component({
  selector: 'app-job-search',
  standalone: true,
  imports: [ReactiveFormsModule, SafeHtmlComponent, NgTemplateOutlet, RouterLink],
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
  readonly candidateContext = inject(CandidateContextService);

  private readonly detailDialog = viewChild<ElementRef<HTMLDialogElement>>('detailDialog');

  readonly contractTypes = CONTRACT_TYPES;
  readonly remoteTypes = REMOTE_TYPES;
  readonly remoteLabels = REMOTE_TYPE_LABELS;
  readonly experienceOptions: { value: ExperienceFilter; label: string }[] = [
    { value: 'all', label: 'Toute expérience' },
    { value: 'junior', label: 'Débutant (0–2 ans)' },
    { value: 'mid', label: 'Confirmé (3–5 ans)' },
    { value: 'senior', label: 'Senior (6+ ans)' },
  ];

  readonly filters = signal<JobSearchFilters>({ ...DEFAULT_JOB_SEARCH_FILTERS });
  readonly appliedFilters = signal<JobSearchFilters>({ ...DEFAULT_JOB_SEARCH_FILTERS });

  readonly allJobs = signal<Job[]>([]);
  readonly selectedJob = signal<Job | null>(null);
  readonly loading = signal(false);
  readonly applyModalOpen = signal(false);
  readonly applying = signal(false);
  readonly generatingLetter = signal(false);
  readonly savedJobIds = signal<Set<string>>(new Set());
  readonly appliedJobIds = signal<Set<string>>(new Set());
  /** questionIndex -> selected choiceIndex */
  readonly quizSelections = signal<Record<number, number>>({});
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly viewMode = signal<CandidateJobsViewMode>('linkedin');
  readonly cardsDetailOpen = signal(false);

  readonly applyForm = this.fb.nonNullable.group({
    coverLetter: [''],
  });

  readonly useClientFilters = computed(() => {
    const f = this.appliedFilters();
    return (
      f.contracts.length > 1 ||
      f.remotes.length > 1 ||
      !!f.company.trim() ||
      !!f.industry.trim() ||
      f.experience !== 'all' ||
      f.quizOnly
    );
  });

  readonly filteredJobs = computed(() => {
    const f = this.appliedFilters();
    return this.allJobs().filter((job) => this.matchesClientFilters(job, f));
  });

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
    this.route.queryParamMap.subscribe((params) => {
      const jobId = params.get('jobId');
      if (!jobId) return;
      const apply = params.get('apply') === '1';
      this.jobService.getById(jobId).subscribe({
        next: (res) => {
          const job = res.data;
          if (!job) return;
          const inList = this.allJobs().find((j) => j.id === job.id);
          if (!inList) {
            this.allJobs.update((list) => [job, ...list]);
          }
          if (this.viewMode() === 'cards') {
            this.openCardsJobDetail(job);
          } else {
            this.selectJob(job);
          }
          if (apply && !this.hasApplied(job.id)) {
            this.openApplyModal();
          }
        },
      });
    });
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
    this.fetchJobs();
  }

  resetFilters(): void {
    this.filters.set({ ...DEFAULT_JOB_SEARCH_FILTERS });
    this.appliedFilters.set({ ...DEFAULT_JOB_SEARCH_FILTERS });
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
      limit: this.useClientFilters() ? API_MAX_LIMIT : 50,
    };

    if (f.keywords.trim()) params.keywords = f.keywords.trim();
    if (f.location.trim()) params.location = f.location.trim();
    if (f.contracts.length === 1) params.contractType = f.contracts[0];
    if (f.remotes.length === 1) params.remoteType = f.remotes[0];

    return params;
  }

  private matchesClientFilters(job: Job, f: JobSearchFilters): boolean {
    if (f.contracts.length && !f.contracts.includes(job.contractType)) return false;
    if (f.remotes.length && !f.remotes.includes(job.remoteType)) return false;

    if (f.keywords.trim()) {
      const k = f.keywords.toLowerCase();
      const langs = (job.languages || []).join(' ');
      const benefits = (job.benefits || []).join(' ');
      const hay = `${job.title} ${job.company?.name || ''} ${stripHtml(job.description)} ${stripHtml(job.requirements || '')} ${job.location} ${job.salaryLabel || ''} ${langs} ${benefits}`.toLowerCase();
      if (!hay.includes(k)) return false;
    }

    if (f.location.trim() && !(job.location || '').toLowerCase().includes(f.location.toLowerCase())) {
      return false;
    }

    if (f.company.trim() && !(job.company?.name || '').toLowerCase().includes(f.company.toLowerCase())) {
      return false;
    }

    if (
      f.industry.trim() &&
      !(job.company?.industry || '').toLowerCase().includes(f.industry.toLowerCase())
    ) {
      return false;
    }

    if (!this.matchesExperience(job, f.experience)) return false;
    if (f.quizOnly && !job.quizEnabled) return false;

    return true;
  }

  private matchesExperience(job: Job, level: ExperienceFilter): boolean {
    if (level === 'all') return true;
    const years = job.experienceYears;
    if (years == null) return level === 'junior';
    if (level === 'junior') return years <= 2;
    if (level === 'mid') return years >= 3 && years <= 5;
    if (level === 'senior') return years >= 6;
    return true;
  }

  setViewMode(mode: CandidateJobsViewMode): void {
    if (this.viewMode() === mode) {
      return;
    }
    this.closeCardsDetail();
    this.viewMode.set(mode);
  }

  selectJob(job: Job): void {
    this.selectedJob.set(job);
    this.jobService.getById(job.id).subscribe({
      next: (res) => res.data && this.selectedJob.set(res.data),
    });
  }

  openCardsJobDetail(job: Job): void {
    this.selectJob(job);
    this.cardsDetailOpen.set(true);
    this.openDialogWhenReady(this.detailDialog);
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

  publicCompanyLink(companyId: string): string[] {
    return ['/entreprises', companyId];
  }

  openJobInNewTab(job: Job, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/offres', job.id])
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  publicJobLink(jobId: string): string[] {
    return ['/offres', jobId];
  }

  selectJobFromList(job: Job, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.selectJob(job);
  }

  quickApply(job: Job, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.selectJob(job);
    if (this.viewMode() === 'cards') {
      this.openCardsJobDetail(job);
    }
    this.openApplyModal();
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

  openApplyModal(): void {
    const job = this.selectedJob();
    if (!job || this.hasApplied(job.id)) return;

    if (!this.candidateContext.profile()?.resumeUrl) {
      this.error.set(
        'Ajoutez un CV dans Mon profil (import PDF ou génération PDF) avant de postuler.'
      );
      return;
    }

    this.applyForm.reset({ coverLetter: '' });
    this.quizSelections.set({});
    this.applyModalOpen.set(true);
    this.jobService.getById(job.id).subscribe({
      next: (res) => {
        if (res.data) this.selectedJob.set(res.data);
      },
    });
  }

  closeApplyModal(): void {
    this.applyModalOpen.set(false);
  }

  generateLetter(): void {
    const job = this.selectedJob();
    if (!job) return;
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
    const job = this.selectedJob();
    if (!job || !this.isQuizEnabled(job)) return undefined;
    const quiz = this.jobQuiz(job);
    if (!quiz) return undefined;
    return quiz.questions.map((_, i) => ({
      questionIndex: i,
      choiceIndex: this.quizSelections()[i] ?? -1,
    }));
  }

  private validateQuizBeforeApply(): string | null {
    const job = this.selectedJob();
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
    const job = this.selectedJob();
    if (!job) return;

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

  async saveJob(job: Job): Promise<void> {
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
    const ok = await this.confirmDialog.confirm({
      title: 'Créer une alerte',
      message: 'Créer une alerte emploi avec les filtres actuels ?',
      confirmLabel: 'Créer',
    });
    if (!ok) return;

    this.alertService.create(
      this.appliedFilters() as unknown as Record<string, unknown>
    ).subscribe({
      next: () => this.success.set('Alerte emploi créée avec les filtres actuels.'),
      error: () => this.error.set('Impossible de créer l\'alerte.'),
    });
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
