import { DatePipe } from '@angular/common';

import { Component, inject, OnInit, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { HttpErrorResponse } from '@angular/common/http';

import {

  CONTRACT_TYPES,

  ContractType,

  JOB_SELECTABLE_STATUSES,

  JOB_STATUS_LABELS,

  JOB_STATUS_HINTS,

  JobStatus,

  REMOTE_TYPES,

  RemoteType,

} from '../../../core/constants/job.constant';

import { JobPayload } from '../../../core/models/job.model';
import {
  cloneQuiz,
  createEmptyQuiz,
  JobQuiz,
} from '../../../core/models/job-quiz.model';
import { JobQuizModalComponent } from './job-quiz-modal/job-quiz-modal.component';
import { RichTextEditorComponent } from '../../../shared/components/rich-text-editor/rich-text-editor.component';
import {
  richTextMinLength,
  richTextRequired,
} from '../../../shared/validators/rich-text.validators';
import { sanitizeRichHtml, stripHtml } from '../../../shared/utils/rich-text.util';

import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { RecruiterJobService } from '../services/job.service';

import { RecruiterContextService } from '../services/recruiter-context.service';

import { APP_ROUTES } from '../../../core/constants/routes.constant';

import {

  defaultJobExpiresAtInput,

  toDateInputValue,

} from '../../../core/utils/job-expiration.util';
import {
  normalizeStringList,
  toNullableStringList,
} from '../../../core/utils/string-list.util';



const MAX_TAGS = 20;

const MAX_LANGUAGES = 15;
const MAX_BENEFITS = 20;



@Component({

  selector: 'app-job-form',

  standalone: true,

  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    JobQuizModalComponent,
    RichTextEditorComponent,
  ],

  templateUrl: './job-form.component.html',

  styleUrl: './job-form.component.css',

})

export class JobFormComponent implements OnInit {

  private readonly fb = inject(FormBuilder);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly jobService = inject(RecruiterJobService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly context = inject(RecruiterContextService);

  readonly routes = APP_ROUTES;



  readonly contractTypes = CONTRACT_TYPES;

  readonly remoteTypes = REMOTE_TYPES;

  readonly jobStatuses = JOB_SELECTABLE_STATUSES;

  readonly statusLabels = JOB_STATUS_LABELS;

  readonly statusHints = JOB_STATUS_HINTS;



  readonly jobId = signal<string | null>(null);

  readonly isEditMode = signal(false);

  readonly isExpiredJob = signal(false);

  readonly loadingJob = signal(false);

  readonly saving = signal(false);

  readonly errorMessage = signal<string | null>(null);

  readonly tags = signal<string[]>([]);

  readonly tagInput = signal('');

  readonly languages = signal<string[]>([]);

  readonly languageInput = signal('');

  readonly benefits = signal<string[]>([]);
  readonly benefitInput = signal('');

  readonly quizEnabled = signal(false);
  readonly quiz = signal<JobQuiz>(createEmptyQuiz());
  readonly quizConfigured = signal(false);
  readonly quizModalOpen = signal(false);
  readonly quizGenerating = signal(false);
  readonly quizError = signal<string | null>(null);



  readonly form = this.fb.nonNullable.group({

    title: ['', [Validators.required, Validators.minLength(3)]],

    description: ['', [richTextRequired(), richTextMinLength(20)]],

    requirements: [''],

    location: [''],

    remoteType: ['on-site' as RemoteType, Validators.required],

    contractType: ['CDI' as ContractType, Validators.required],

    salaryLabel: ['', [Validators.maxLength(255)]],

    experienceYears: [''],

    status: ['draft' as JobStatus],

    expiresAt: [defaultJobExpiresAtInput(), Validators.required],

  });



  ngOnInit(): void {

    const id = this.route.snapshot.paramMap.get('id');

    if (id) {

      this.jobId.set(id);

      this.isEditMode.set(true);

      this.loadJob(id);

    }

  }



  loadJob(id: string): void {
    this.loadingJob.set(true);

    this.jobService.getById(id).subscribe({

      next: (res) => {

        const job = res.data;

        if (!job) return;

        this.form.patchValue({

          title: job.title,

          description: job.description,

          requirements: job.requirements || '',

          location: job.location || '',

          remoteType: job.remoteType,

          contractType: job.contractType,

          salaryLabel: job.salaryLabel || '',

          experienceYears:

            job.experienceYears != null ? String(job.experienceYears) : '',

          status: job.status,

          expiresAt: toDateInputValue(job.expiresAt),

        });

        this.isExpiredJob.set(job.status === 'expired');

        if (job.status === 'expired') {

          this.form.controls.expiresAt.disable();

          this.form.controls.status.disable();

        }

        this.tags.set(normalizeStringList(job.tags));

        this.languages.set(normalizeStringList(job.languages));
        this.benefits.set(normalizeStringList(job.benefits));

        this.quizEnabled.set(Boolean(job.quizEnabled));
        if (job.quiz?.questions?.length) {
          this.quiz.set(cloneQuiz(job.quiz as JobQuiz));
          this.quizConfigured.set(true);
        }

        this.loadingJob.set(false);

      },

      error: () => {
        this.errorMessage.set('Impossible de charger l\'offre.');
        this.loadingJob.set(false);
      },

    });

  }

  toggleQuizEnabled(enabled: boolean): void {
    this.quizEnabled.set(enabled);
    if (!enabled) {
      this.quizConfigured.set(false);
      this.quizError.set(null);
    }
  }

  openQuizModal(): void {
    this.quizError.set(null);
    this.quizModalOpen.set(true);
  }

  closeQuizModal(): void {
    this.quizModalOpen.set(false);
  }

  onQuizSaved(quiz: JobQuiz): void {
    this.quiz.set(cloneQuiz(quiz));
    this.quizConfigured.set(true);
    this.quizModalOpen.set(false);
    this.quizError.set(null);
  }

  generateQuizAi(): void {
    const raw = this.form.getRawValue();
    const title = raw.title?.trim() || '';
    const description = stripHtml(raw.description || '').trim();

    if (title.length < 3) {
      this.quizError.set(
        'Indiquez au moins un titre d’offre (3 caractères minimum) avant de générer le quiz.'
      );
      return;
    }

    this.quizGenerating.set(true);
    this.quizError.set(null);
    this.jobService
      .generateQuiz({
        title,
        description: description.length >= 1 ? description : 'Poste à pourvoir.',
        requirements: stripHtml(raw.requirements || '').trim() || null,
        tags: this.tags().length ? this.tags() : null,
        languages: this.languages().length ? this.languages() : null,
      })
      .subscribe({
        next: (res) => {
          if (res.data) {
            this.quiz.set(cloneQuiz(res.data));
          }
          this.quizGenerating.set(false);
        },
        error: (err: HttpErrorResponse) => {
          const details = err.error?.errors as { field?: string; message?: string }[] | undefined;
          const detailMsg = details?.[0]?.message;
          this.quizError.set(
            detailMsg || err.error?.message || 'Génération du quiz impossible.'
          );
          this.quizGenerating.set(false);
        },
      });
  }

  private validateQuizBeforeSubmit(): string | null {
    if (!this.quizEnabled()) return null;
    if (!this.quizConfigured()) {
      return 'Configurez le quiz ou désactivez-le avant d’enregistrer l’offre.';
    }
    const q = this.quiz();
    for (let i = 0; i < q.questions.length; i += 1) {
      const question = q.questions[i];
      if (question.text.trim().length < 5) {
        return `La question ${i + 1} doit contenir au moins 5 caractères.`;
      }
      for (let j = 0; j < question.choices.length; j += 1) {
        if (!question.choices[j].text.trim()) {
          return `Remplissez les 3 réponses de la question ${i + 1}.`;
        }
      }
    }
    return null;
  }



  addTag(): void {

    this.addToList(this.tagInput, this.tags, MAX_TAGS);

  }



  onTagKeydown(event: KeyboardEvent): void {

    if (event.key === 'Enter') {

      event.preventDefault();

      this.addTag();

    }

  }



  removeTag(tag: string): void {

    this.tags.update((t) => t.filter((item) => item !== tag));

  }



  addLanguage(): void {

    this.addToList(this.languageInput, this.languages, MAX_LANGUAGES);

  }



  onLanguageKeydown(event: KeyboardEvent): void {

    if (event.key === 'Enter') {

      event.preventDefault();

      this.addLanguage();

    }

  }



  removeLanguage(language: string): void {

    this.languages.update((list) => list.filter((item) => item !== language));

  }

  addBenefit(): void {
    this.addToList(this.benefitInput, this.benefits, MAX_BENEFITS, 80);
  }

  onBenefitKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addBenefit();
    }
  }

  removeBenefit(benefit: string): void {
    this.benefits.update((list) => list.filter((item) => item !== benefit));
  }



  private formatSaveError(err: HttpErrorResponse): string {
    const body = err.error as {
      message?: string;
      errors?: { field?: string; message?: string }[];
    } | null;
    const details = body?.errors
      ?.map((e) => {
        const label = e.field === 'tags' ? 'Compétences' : e.field === 'languages' ? 'Langues' : e.field;
        const field = label ? `${label}: ` : '';
        return `${field}${e.message ?? ''}`;
      })
      .filter(Boolean);
    if (details?.length) {
      return details.join(' · ');
    }
    return body?.message || 'Enregistrement impossible.';
  }

  /** Input type="number" yields number | null; edit mode may use string. */
  private parseExperienceYears(
    value: string | number | null | undefined
  ): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const n =
      typeof value === 'number' ? value : Number.parseInt(String(value).trim(), 10);
    return Number.isNaN(n) ? null : n;
  }

  private addToList(
    input: ReturnType<typeof signal<string>>,
    list: ReturnType<typeof signal<string[]>>,
    max: number,
    maxItemLength = 50
  ): void {
    const value = input().trim().slice(0, maxItemLength);
    if (!value) return;
    if (list().includes(value)) return;
    if (list().length >= max) return;
    list.update((items) => [...items, value]);
    input.set('');
  }



  async onSubmit(): Promise<void> {

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      return;

    }

    const ok = await this.confirmDialog.confirm({

      title: this.isEditMode() ? 'Mettre à jour l\'offre' : 'Publier l\'offre',

      message: this.isEditMode()

        ? 'Enregistrer les modifications de cette offre ?'

        : 'Publier cette offre d\'emploi ?',

      confirmLabel: this.isEditMode() ? 'Mettre à jour' : 'Publier',

    });

    if (!ok) return;

    const quizValidation = this.validateQuizBeforeSubmit();
    if (quizValidation) {
      this.errorMessage.set(quizValidation);
      return;
    }

    const raw = this.form.getRawValue();

    const experienceYears = this.parseExperienceYears(raw.experienceYears);



    const payload: JobPayload = {

      title: raw.title,

      description: sanitizeRichHtml(raw.description),

      requirements: sanitizeRichHtml(raw.requirements) || null,

      location: raw.location || null,

      remoteType: raw.remoteType,

      contractType: raw.contractType,

      salaryLabel: raw.salaryLabel?.trim() || null,

      experienceYears,

      tags: toNullableStringList(this.tags()),

      languages: toNullableStringList(this.languages()),

      benefits: toNullableStringList(this.benefits()),

      ...(this.isExpiredJob()

        ? {}

        : { status: raw.status, expiresAt: raw.expiresAt }),

      quizEnabled: this.quizEnabled(),
      quiz: this.quizEnabled() ? this.quiz() : null,

    };



    this.saving.set(true);

    this.errorMessage.set(null);



    const request$ = this.isEditMode() && this.jobId()

      ? this.jobService.update(this.jobId()!, payload)

      : this.jobService.create(payload);



    request$.subscribe({

      next: () => {

        void this.router.navigate([APP_ROUTES.RECRUITER.JOBS]);

      },

      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(this.formatSaveError(err));
        this.saving.set(false);
      },

    });

  }

}


