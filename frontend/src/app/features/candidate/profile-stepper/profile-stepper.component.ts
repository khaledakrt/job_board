import {
  afterNextRender,
  Component,
  inject,
  Injector,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError, finalize, timeout } from 'rxjs';
import { CvDropUploaderComponent } from '../../../shared/components/cv-drop-uploader/cv-drop-uploader.component';
import { CircularAvatarUploaderComponent } from '../../../shared/components/circular-avatar-uploader/circular-avatar-uploader.component';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { CandidateProfileService } from '../services/candidate-profile.service';
import { CandidateContextService } from '../services/candidate-context.service';
import {
  CandidateDashboardService,
  RecruiterPreview,
} from '../services/candidate-dashboard.service';
import {
  ExperienceBlock,
  EducationBlock,
  ResumeParseResult,
} from '../../../core/models/candidate-profile.model';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import { CvParsePreviewComponent } from './cv-parse-preview/cv-parse-preview.component';

@Component({
  selector: 'app-profile-stepper',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CvDropUploaderComponent,
    CircularAvatarUploaderComponent,
    CvParsePreviewComponent,
  ],
  templateUrl: './profile-stepper.component.html',
  styleUrl: './profile-stepper.component.css',
})
export class ProfileStepperComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(CandidateProfileService);
  private readonly dashboardService = inject(CandidateDashboardService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly injector = inject(Injector);
  readonly context = inject(CandidateContextService);

  private readonly cvPreview = viewChild(CvParsePreviewComponent);

  readonly currentStep = signal(1);
  readonly parsing = signal(false);
  readonly parseStatus = signal<string | null>(null);
  private parseStatusTimer: ReturnType<typeof setInterval> | null = null;
  readonly saving = signal(false);
  readonly skills = signal<string[]>([]);
  readonly skillInput = signal('');
  readonly languages = signal<string[]>([]);
  readonly langInput = signal('');
  readonly certifications = signal<string[]>([]);
  readonly certInput = signal('');
  readonly recruiterPreview = signal<RecruiterPreview | null>(null);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly pendingAvatar = signal<File | null>(null);
  readonly parsePreviewOpen = signal(false);
  readonly parsePreviewData = signal<ResumeParseResult | null>(null);
  /** import = PDF uploadé | manual = saisie puis PDF généré */
  readonly cvMode = signal<'import' | 'manual'>('manual');
  readonly generatingPdf = signal(false);

  readonly identityForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: [''],
    professionalTitle: ['', Validators.required],
    bio: [''],
    minSalary: [''],
    linkedinUrl: [''],
    portfolioUrl: [''],
    mobility: [''],
    preferredLocations: [''],
  });

  readonly experiences = this.fb.array([this.createExperienceGroup()]);
  readonly education = this.fb.array([this.createEducationGroup()]);

  ngOnInit(): void {
    this.context.loadProfile().subscribe({
      next: () => this.hydrateFromProfile(),
      error: () => {},
    });
  }

  setCvMode(mode: 'import' | 'manual'): void {
    this.cvMode.set(mode);
  }

  get experiencesArray(): FormArray {
    return this.experiences;
  }

  get educationArray(): FormArray {
    return this.education;
  }

  createExperienceGroup(data?: ExperienceBlock) {
    return this.fb.group({
      company: [data?.company || ''],
      title: [data?.title || ''],
      startDate: [data?.startDate || ''],
      endDate: [data?.endDate || ''],
      description: [data?.description || ''],
    });
  }

  createEducationGroup(data?: EducationBlock) {
    return this.fb.group({
      institution: [data?.institution || ''],
      degree: [data?.degree || ''],
      startDate: [data?.startDate || ''],
      endDate: [data?.endDate || ''],
    });
  }

  hydrateFromProfile(): void {
    const p = this.context.profile();
    if (!p) return;
    this.identityForm.patchValue({
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      phone: p.phone || '',
      professionalTitle: p.professionalTitle || '',
      bio: p.bio || '',
      minSalary: p.minSalary?.toString() || '',
      linkedinUrl: p.linkedinUrl || '',
      portfolioUrl: p.portfolioUrl || '',
      mobility: p.jobPreferences?.mobility || '',
      preferredLocations: (p.jobPreferences?.preferredLocations || []).join(', '),
    });
    this.skills.set(p.skills || []);
    this.languages.set(p.languages || []);
    this.certifications.set(p.certifications || []);
    if (p.experiences?.length) {
      this.experiences.clear();
      p.experiences.forEach((e) => this.experiences.push(this.createExperienceGroup(e)));
    }
    if (p.education?.length) {
      this.education.clear();
      p.education.forEach((e) => this.education.push(this.createEducationGroup(e)));
    }
    this.cvMode.set(p.resumeUrl ? 'import' : 'manual');
  }

  onCvSelected(file: File): void {
    this.parsing.set(true);
    this.error.set(null);
    this.message.set(null);
    this.clearParseStatusTimer();

    const started = Date.now();
    this.parseStatus.set(
      'Analyse IA locale (Ollama)… 30 s à 2 min la première fois, puis plus rapide.'
    );
    this.parseStatusTimer = setInterval(() => {
      const sec = Math.floor((Date.now() - started) / 1000);
      if (sec >= 15) {
        this.parseStatus.set(`Analyse en cours… ${sec} s (normal avec Ollama, patientez).`);
      }
    }, 5000);

    this.profileService
      .parseResume(file)
      .pipe(
        timeout(180_000),
        finalize(() => {
          this.clearParseStatusTimer();
          this.parsing.set(false);
          this.parseStatus.set(null);
        })
      )
      .subscribe({
        next: (res) => {
          const d = res.data;
          if (d) {
            this.parsePreviewData.set(d);
            this.parsePreviewOpen.set(true);
            afterNextRender(
              () => {
                const preview = this.cvPreview();
                if (preview) {
                  preview.hydrateFromData(d);
                }
              },
              { injector: this.injector }
            );
            if (d.resumeSaved || d.savedToProfile) {
              this.context.loadProfile().subscribe({
                next: (r) => r.data && this.context.setProfile(r.data),
              });
            }
          }
        },
        error: (err: HttpErrorResponse | TimeoutError) => {
          if (err instanceof TimeoutError) {
            this.error.set(
              'Analyse trop longue (> 3 min). Vérifiez qu’Ollama tourne, réessayez, ou complétez le profil à la main.'
            );
            return;
          }
          this.error.set(err.error?.message || 'Échec de l\'analyse du CV.');
        },
      });
  }

  private clearParseStatusTimer(): void {
    if (this.parseStatusTimer) {
      clearInterval(this.parseStatusTimer);
      this.parseStatusTimer = null;
    }
  }

  closeParsePreview(): void {
    this.parsePreviewOpen.set(false);
    this.parsePreviewData.set(null);
  }

  applyParsedData(d: ResumeParseResult): void {
    this.identityForm.patchValue({
      firstName: d.first_name || '',
      lastName: d.last_name || '',
      phone: d.phone || '',
      professionalTitle: d.professional_title || '',
      bio: d.bio || '',
    });
    this.skills.set([...(d.skills || [])]);

    this.experiences.clear();
    if (d.experiences?.length) {
      d.experiences.forEach((exp) =>
        this.experiences.push(this.createExperienceGroup(exp))
      );
    } else {
      this.experiences.push(this.createExperienceGroup());
    }

    this.education.clear();
    if (d.education?.length) {
      d.education.forEach((edu) =>
        this.education.push(this.createEducationGroup(edu))
      );
    } else {
      this.education.push(this.createEducationGroup());
    }

    const expCount = d.experiences?.length ?? 0;
    const eduCount = d.education?.length ?? 0;
    const modeLabel = d.parserMode === 'ai' ? 'IA' : 'automatique';
    let msg = `Données appliquées (analyse ${modeLabel}).`;
    if (expCount || eduCount) {
      msg += ` ${expCount} expérience${expCount > 1 ? 's' : ''}, ${eduCount} formation${eduCount > 1 ? 's' : ''}.`;
    }
    this.message.set(msg);
    this.closeParsePreview();

    if (expCount > 0) {
      this.currentStep.set(2);
    } else if (eduCount > 0) {
      this.currentStep.set(3);
    }
  }

  onAvatarSelected(file: File): void {
    this.pendingAvatar.set(file);
  }

  addSkill(): void {
    const v = this.skillInput().trim();
    if (!v || this.skills().includes(v)) return;
    this.skills.update((s) => [...s, v]);
    this.skillInput.set('');
  }

  removeSkill(skill: string): void {
    this.skills.update((s) => s.filter((x) => x !== skill));
  }

  addLang(): void {
    const v = this.langInput().trim();
    if (!v || this.languages().includes(v)) return;
    this.languages.update((s) => [...s, v]);
    this.langInput.set('');
  }

  removeLang(lang: string): void {
    this.languages.update((s) => s.filter((x) => x !== lang));
  }

  addCert(): void {
    const v = this.certInput().trim();
    if (!v || this.certifications().includes(v)) return;
    this.certifications.update((s) => [...s, v]);
    this.certInput.set('');
  }

  removeCert(cert: string): void {
    this.certifications.update((s) => s.filter((x) => x !== cert));
  }

  addExperience(): void {
    this.experiences.push(this.createExperienceGroup());
  }

  removeExperience(i: number): void {
    if (this.experiences.length > 1) this.experiences.removeAt(i);
  }

  addEducation(): void {
    this.education.push(this.createEducationGroup());
  }

  removeEducation(i: number): void {
    if (this.education.length > 1) this.education.removeAt(i);
  }

  nextStep(): void {
    if (this.currentStep() === 1 && this.identityForm.invalid) {
      this.identityForm.markAllAsTouched();
      return;
    }
    if (this.currentStep() === 3) {
      this.loadRecruiterPreview();
    }
    this.currentStep.update((s) => Math.min(4, s + 1));
  }

  loadRecruiterPreview(): void {
    this.dashboardService.getRecruiterPreview().subscribe({
      next: (res) => this.recruiterPreview.set(res.data || null),
    });
  }

  prevStep(): void {
    this.currentStep.update((s) => Math.max(1, s - 1));
  }

  async saveProfile(): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: this.context.hasProfile() ? 'Mettre à jour le profil' : 'Créer le profil',
      message: this.context.hasProfile()
        ? 'Enregistrer les modifications de votre profil candidat ?'
        : 'Créer votre profil candidat ?',
      confirmLabel: 'Enregistrer',
    });
    if (!ok) return;

    this.saving.set(true);
    this.error.set(null);
    const identity = this.identityForm.getRawValue();
    const payload = {
      firstName: identity.firstName,
      lastName: identity.lastName,
      phone: identity.phone || null,
      professionalTitle: identity.professionalTitle,
      bio: identity.bio || null,
      minSalary: identity.minSalary ? Number(identity.minSalary) : null,
      skills: this.skills(),
      languages: this.languages(),
      certifications: this.certifications(),
      linkedinUrl: identity.linkedinUrl || null,
      portfolioUrl: identity.portfolioUrl || null,
      jobPreferences: {
        mobility: identity.mobility || undefined,
        preferredLocations: identity.preferredLocations
          ? identity.preferredLocations.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      },
      experiences: this.buildExperiencesPayload(),
      education: this.buildEducationPayload(),
    };

    const save$ = this.context.hasProfile()
      ? this.profileService.updateProfile(payload)
      : this.profileService.createProfile(payload);

    save$.subscribe({
      next: (res) => {
        if (res.data) {
          this.context.setProfile(res.data);
          const avatar = this.pendingAvatar();
          const afterAvatar = () => this.afterProfileSaved();
          if (avatar) {
            this.profileService.uploadAvatar(avatar).subscribe({
              next: (r) => {
                if (r.data) {
                  this.context.setProfile(r.data);
                }
                this.pendingAvatar.set(null);
                afterAvatar();
              },
              error: (err: HttpErrorResponse) => {
                this.error.set(err.error?.message || 'Impossible d\'enregistrer la photo.');
                this.saving.set(false);
              },
            });
          } else {
            afterAvatar();
          }
        }
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'Impossible d\'enregistrer le profil.');
        this.saving.set(false);
      },
    });
  }

  resumeUrl(): string | null {
    return resolveUploadUrl(this.context.profile()?.resumeUrl ?? null);
  }

  generateResumePdf(): void {
    this.generatingPdf.set(true);
    this.error.set(null);
    this.profileService.generateResumePdf().subscribe({
      next: (res) => {
        if (res.data?.profile) {
          this.context.setProfile(res.data.profile);
        }
        this.message.set(
          res.message || 'CV PDF généré. Les recruteurs peuvent le télécharger depuis vos candidatures.'
        );
        this.generatingPdf.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message || 'Impossible de générer le CV PDF.');
        this.generatingPdf.set(false);
      },
    });
  }

  private buildExperiencesPayload(): ExperienceBlock[] {
    return (this.experiences.getRawValue() as ExperienceBlock[]).filter(
      (e) => e.title?.trim() || e.company?.trim()
    );
  }

  private buildEducationPayload(): EducationBlock[] {
    return (this.education.getRawValue() as EducationBlock[]).filter(
      (e) => e.institution?.trim() || e.degree?.trim()
    );
  }

  private afterProfileSaved(): void {
    if (this.cvMode() === 'manual') {
      this.generateResumePdfAfterSave();
      return;
    }
    this.finishSave('Profil enregistré avec succès.');
  }

  private generateResumePdfAfterSave(): void {
    this.generatingPdf.set(true);
    this.profileService.generateResumePdf().subscribe({
      next: (res) => {
        if (res.data?.profile) {
          this.context.setProfile(res.data.profile);
        }
        this.finishSave(
          'Profil enregistré et CV PDF généré pour les recruteurs.'
        );
        this.generatingPdf.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.finishSave('Profil enregistré, mais la génération du CV PDF a échoué.');
        this.error.set(err.error?.message || 'Génération PDF impossible.');
        this.generatingPdf.set(false);
      },
    });
  }

  private finishSave(msg: string): void {
    this.message.set(msg);
    this.saving.set(false);
  }
}
