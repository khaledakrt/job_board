import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CircularAvatarUploaderComponent } from '../../../shared/components/circular-avatar-uploader/circular-avatar-uploader.component';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { CandidateProfileService } from '../services/candidate-profile.service';
import { CandidateContextService } from '../services/candidate-context.service';
import { RecruiterPreview } from '../services/candidate-dashboard.service';
import {
  ExperienceBlock,
  EducationBlock,
} from '../../../core/models/candidate-profile.model';
import { ProtectedFileService } from '../../../core/services/protected-file.service';

@Component({
  selector: 'app-profile-stepper',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CircularAvatarUploaderComponent,
  ],
  templateUrl: './profile-stepper.component.html',
  styleUrl: './profile-stepper.component.css',
})
export class ProfileStepperComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(CandidateProfileService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly protectedFileService = inject(ProtectedFileService);
  readonly context = inject(CandidateContextService);

  readonly currentStep = signal(1);
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
      city: [data?.city || ''],
      startDate: [data?.startDate || ''],
      endDate: [data?.endDate || ''],
      current: [Boolean(data?.current || (!data?.endDate && (data?.title || data?.company)))],
      description: [data?.description || ''],
    });
  }

  createEducationGroup(data?: EducationBlock) {
    return this.fb.group({
      institution: [data?.institution || ''],
      degree: [data?.degree || ''],
      city: [data?.city || ''],
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

  setExperienceCurrent(index: number, checked: boolean): void {
    const group = this.experiences.at(index);
    group.patchValue({
      current: checked,
      endDate: checked ? '' : group.value.endDate,
    });
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
    this.recruiterPreview.set(this.buildLocalRecruiterPreview());
  }

  prevStep(): void {
    this.currentStep.update((s) => Math.max(1, s - 1));
  }

  async saveProfile(): Promise<void> {
    if (this.identityForm.invalid) {
      this.currentStep.set(1);
      this.identityForm.markAllAsTouched();
      this.error.set('Complétez le prénom, le nom et le titre professionnel avant d’enregistrer.');
      return;
    }

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
      firstName: this.cleanOptionalString(identity.firstName),
      lastName: this.cleanOptionalString(identity.lastName),
      phone: this.cleanOptionalString(identity.phone),
      professionalTitle: this.cleanOptionalString(identity.professionalTitle),
      bio: this.cleanOptionalString(identity.bio),
      minSalary: identity.minSalary ? Number(identity.minSalary) : null,
      skills: this.skills(),
      languages: this.languages(),
      certifications: this.certifications(),
      linkedinUrl: this.normalizeOptionalUrl(identity.linkedinUrl),
      portfolioUrl: this.normalizeOptionalUrl(identity.portfolioUrl),
      jobPreferences: {
        mobility: this.cleanOptionalString(identity.mobility) || undefined,
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
        this.error.set(this.formatHttpError(err, 'Impossible d\'enregistrer le profil.'));
        this.saving.set(false);
      },
    });
  }

  resumeUrl(): string | null {
    return this.protectedFileService.resolveUrl(this.context.profile()?.resumeUrl ?? null);
  }

  openResume(event?: Event): void {
    event?.preventDefault();
    const url = this.resumeUrl();
    if (!url) {
      this.error.set('CV indisponible pour le moment.');
      return;
    }

    this.protectedFileService.openFile(url, () => this.error.set('Impossible d’ouvrir le CV.'));
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
    return (this.experiences.getRawValue() as ExperienceBlock[])
      .filter((e) => e.title?.trim() || e.company?.trim())
      .map((e) => ({
        company: this.cleanOptionalString(e.company) || '',
        title: this.cleanOptionalString(e.title) || '',
        city: this.cleanOptionalString(e.city) || '',
        startDate: this.cleanOptionalString(e.startDate) || '',
        endDate: e.current ? '' : this.cleanOptionalString(e.endDate) || '',
        current: Boolean(e.current),
        description: this.cleanOptionalString(e.description) || '',
      }));
  }

  private buildEducationPayload(): EducationBlock[] {
    return (this.education.getRawValue() as EducationBlock[])
      .filter((e) => e.institution?.trim() || e.degree?.trim())
      .map((e) => ({
        institution: this.cleanOptionalString(e.institution) || '',
        degree: this.cleanOptionalString(e.degree) || '',
        city: this.cleanOptionalString(e.city) || '',
        startDate: this.cleanOptionalString(e.startDate) || '',
        endDate: this.cleanOptionalString(e.endDate) || '',
      }));
  }

  private buildLocalRecruiterPreview(): RecruiterPreview {
    const identity = this.identityForm.getRawValue();
    const checks = [
      Boolean(identity.firstName.trim()),
      Boolean(identity.lastName.trim()),
      Boolean(identity.professionalTitle.trim()),
      Boolean(identity.phone.trim()),
      Boolean(identity.bio.trim()),
      Boolean(this.context.profile()?.resumeUrl),
      Boolean(this.context.profile()?.avatarUrl || this.pendingAvatar()),
      this.skills().length > 0,
      this.buildExperiencesPayload().length > 0,
      this.buildEducationPayload().length > 0,
      this.languages().length > 0,
      Boolean(identity.linkedinUrl.trim()),
    ];
    const completionPercent = Math.round((checks.filter(Boolean).length / checks.length) * 100);
    const tips: { id: string; text: string }[] = [];
    if (!this.context.profile()?.resumeUrl) tips.push({ id: 'resume', text: 'Enregistrez le profil pour générer votre CV PDF.' });
    if (!this.context.profile()?.avatarUrl && !this.pendingAvatar()) tips.push({ id: 'avatar', text: 'Ajoutez une photo pour rendre le profil plus crédible.' });
    if (!this.skills().length) tips.push({ id: 'skills', text: 'Ajoutez au moins quelques compétences clés.' });
    if (!this.buildExperiencesPayload().length) tips.push({ id: 'exp', text: 'Ajoutez une expérience professionnelle, même courte.' });
    if (!identity.bio.trim()) tips.push({ id: 'bio', text: 'Rédigez un résumé de 2 à 3 phrases.' });
    if (!this.languages().length) tips.push({ id: 'lang', text: 'Indiquez les langues que vous maîtrisez.' });
    if (!identity.linkedinUrl.trim()) tips.push({ id: 'linkedin', text: 'Ajoutez un lien LinkedIn si vous en avez un.' });
    if (completionPercent >= 90) tips.push({ id: 'done', text: 'Excellent profil, vous maximisez vos chances.' });

    return {
      profile: {
        firstName: identity.firstName,
        lastName: identity.lastName,
        professionalTitle: identity.professionalTitle,
        bio: identity.bio,
        skills: this.skills(),
      },
      completionPercent,
      tips: tips.slice(0, 5),
    };
  }

  private cleanOptionalString(value: unknown): string | null {
    const text = String(value ?? '').trim();
    return text || null;
  }

  private normalizeOptionalUrl(value: unknown): string | null {
    const text = this.cleanOptionalString(value);
    if (!text) return null;
    return /^https?:\/\//i.test(text) ? text : `https://${text}`;
  }

  private formatHttpError(err: HttpErrorResponse, fallback: string): string {
    const errors = err.error?.errors;
    if (Array.isArray(errors) && errors.length) {
      return errors
        .map((e) => `${e.field ? `${e.field}: ` : ''}${e.message || 'Champ invalide'}`)
        .join(' · ');
    }
    return err.error?.message || fallback;
  }

  private afterProfileSaved(): void {
    this.generateResumePdfAfterSave();
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
