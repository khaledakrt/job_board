import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Meta, Title } from '@angular/platform-browser';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { USER_ROLES } from '../../../core/constants/roles.constant';
import { Job } from '../../../core/models/job.model';
import { PublicJobQuiz } from '../../../core/models/job-quiz.model';
import { QuizAnswerPayload } from '../../../core/models/job-quiz.model';
import { CandidateJobService } from '../../candidate/services/candidate-job.service';
import { CandidateContextService } from '../../candidate/services/candidate-context.service';
import { CandidateApplicationsService } from '../../candidate/services/candidate-applications.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import {
  experienceDisplayLabel,
  remoteLabel,
  salaryDisplayLabel,
} from '../../../core/utils/job-display.util';
import { SafeHtmlComponent } from '../../../shared/components/safe-html/safe-html.component';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-public-job-page',
  standalone: true,
  imports: [RouterLink, SafeHtmlComponent, ReactiveFormsModule, TranslatePipe],
  templateUrl: './public-job-page.component.html',
  styleUrl: './public-job-page.component.css',
})
export class PublicJobPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly jobService = inject(CandidateJobService);
  private readonly authService = inject(AuthService);
  private readonly candidateContext = inject(CandidateContextService);
  private readonly applicationsService = inject(CandidateApplicationsService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly i18n = inject(I18nService);

  readonly routes = APP_ROUTES;

  readonly selectedJob = signal<Job | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly applyError = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly applyModalOpen = signal(false);
  readonly applying = signal(false);
  readonly generatingLetter = signal(false);
  readonly hasApplied = signal(false);
  readonly quizSelections = signal<Record<number, number>>({});

  readonly applyForm = this.fb.nonNullable.group({
    coverLetter: [''],
  });

  private activeQuizJobId: string | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set(this.i18n.translate('public.job.notFound'));
      this.loading.set(false);
      return;
    }

    this.jobService.getById(id).subscribe({
      next: (res) => {
        const job = res.data ?? null;
        this.selectedJob.set(job);
        if (!job) {
          this.error.set(this.i18n.translate('public.job.unavailable'));
        } else {
          this.activeQuizJobId = job.id;
          this.updatePageMeta(job);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.i18n.translate('public.job.loadError'));
        this.loading.set(false);
      },
    });

    if (this.isCandidate()) {
      this.candidateContext.loadProfile().subscribe();
      this.applicationsService.listAppliedJobIds().subscribe({
        next: (res) => {
          const ids = res.data || [];
          this.hasApplied.set(ids.includes(id));
        },
      });
    }
  }

  isCandidate(): boolean {
    return (
      this.authService.isAuthenticated() &&
      this.authService.user()?.role === USER_ROLES.CANDIDATE
    );
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

  private updatePageMeta(job: Job): void {
    const companyName = job.company?.name || 'JobBoard';
    const pageTitle = `${job.title} - ${companyName}`;
    const description = this.truncate(
      this.stripHtml(job.description) || this.i18n.translate('public.job.metaDescription'),
      160
    );
    const imageUrl = this.companyLogo(job);

    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'article' });
    this.meta.updateTag({ name: 'twitter:card', content: imageUrl ? 'summary_large_image' : 'summary' });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });

    if (imageUrl) {
      this.meta.updateTag({ property: 'og:image', content: imageUrl });
      this.meta.updateTag({ name: 'twitter:image', content: imageUrl });
    }
  }

  private stripHtml(value: string): string {
    return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 1).trim()}…`;
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

  async onApply(): Promise<void> {
    const job = this.selectedJob();
    if (!job) return;

    if (!this.authService.isAuthenticated()) {
      await this.router.navigate([APP_ROUTES.AUTH.LOGIN], {
        queryParams: { returnUrl: APP_ROUTES.PUBLIC.JOB(job.id) },
      });
      return;
    }

    if (!this.isCandidate()) {
      await this.router.navigate([APP_ROUTES.AUTH.LOGIN]);
      return;
    }

    this.tryOpenApply(job);
  }

  tryOpenApply(job: Job): void {
    this.applyError.set(null);

    if (this.hasApplied()) {
      this.applyError.set(this.i18n.translate('public.job.alreadyApplied'));
      return;
    }

    if (!this.candidateContext.profile()?.resumeUrl) {
      this.applyError.set(
        this.i18n.translate('public.job.resumeRequired')
      );
      return;
    }

    if (this.isQuizEnabled(job) && !this.isQuizCompleteForJob(job)) {
      this.applyError.set(this.i18n.translate('public.job.quizRequired'));
      return;
    }

    this.applyForm.reset({ coverLetter: '' });
    this.applyModalOpen.set(true);
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
        this.applyError.set(this.i18n.translate('public.job.generateLetterError'));
        this.generatingLetter.set(false);
      },
    });
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

  async submitApplication(): Promise<void> {
    const job = this.selectedJob();
    if (!job) return;

    const ok = await this.confirmDialog.confirm({
      title: this.i18n.translate('public.job.confirmTitle'),
      message: `${this.i18n.translate('public.job.confirmMessagePrefix')} « ${job.title} » ?`,
      confirmLabel: this.i18n.translate('public.job.confirmLabel'),
    });
    if (!ok) return;

    this.applying.set(true);
    this.applyError.set(null);

    const letter = this.applyForm.controls.coverLetter.value?.trim();
    const payload: { coverLetter?: string; quizAnswers?: QuizAnswerPayload[] } = {};
    if (letter) {
      payload.coverLetter = letter;
    }
    const quizAnswers = this.buildQuizAnswers();
    if (quizAnswers?.length) {
      payload.quizAnswers = quizAnswers;
    }

    this.jobService.apply(job.id, payload).subscribe({
      next: () => {
        this.hasApplied.set(true);
        this.success.set(this.i18n.translate('public.job.applicationSuccess'));
        this.applying.set(false);
        this.closeApplyModal();
      },
      error: (err: HttpErrorResponse) => {
        const msg = (err.error as { message?: string })?.message;
        if (err.status === 409) {
          this.applyError.set(this.i18n.translate('public.job.alreadyApplied'));
          this.hasApplied.set(true);
        } else {
          this.applyError.set(msg || this.i18n.translate('public.job.applicationFailed'));
        }
        this.applying.set(false);
      },
    });
  }
}
