import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { startWith } from 'rxjs';
import { CircularLogoUploaderComponent } from '../shared/circular-logo-uploader/circular-logo-uploader.component';
import { CompanyService } from '../services/company.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { RecruiterContextService } from '../services/recruiter-context.service';
import { Company, CompanyFormPayload } from '../../../core/models/company.model';
import { COMPANY_SIZES, INDUSTRIES, LEGAL_FORMS } from './company-onboarding.constants';
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY } from './countries.constants';
import { computeProfileProgress } from './company-profile-progress';

const SIRET_PATTERN = /^\d{14}$/;
const URL_PATTERN = /^https?:\/\/.+/i;

@Component({
  selector: 'app-company-onboarding',
  standalone: true,
  imports: [ReactiveFormsModule, CircularLogoUploaderComponent],
  templateUrl: './company-onboarding.component.html',
  styleUrl: './company-onboarding.component.css',
})
export class CompanyOnboardingComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly companyService = inject(CompanyService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  readonly context = inject(RecruiterContextService);

  readonly legalForms = LEGAL_FORMS;
  readonly companySizes = COMPANY_SIZES;
  readonly industries = INDUSTRIES;
  readonly currentYear = new Date().getFullYear();
  readonly frequentCountries = COUNTRY_OPTIONS.filter((c) => c.group === 'frequent');
  readonly otherCountries = COUNTRY_OPTIONS.filter((c) => c.group === 'all');

  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly pendingLogoFile = signal<File | null>(null);
  private readonly hydratedCompanyId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    legalName: [''],
    legalForm: [''],
    siret: ['', [Validators.pattern(/^\d{0,14}$/)]],
    vatNumber: [''],
    streetAddress: ['', [Validators.maxLength(255)]],
    postalCode: ['', [Validators.maxLength(20)]],
    city: ['', [Validators.required, Validators.maxLength(128)]],
    country: [DEFAULT_COUNTRY, [Validators.required]],
    contactEmail: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    contactPhone: ['', [Validators.maxLength(32)]],
    contactEmailPublic: [false],
    contactPhonePublic: [false],
    website: ['', [Validators.maxLength(512)]],
    linkedinUrl: ['', [Validators.maxLength(512)]],
    industry: ['', [Validators.required]],
    scaleSize: ['', [Validators.required]],
    foundedYear: ['' as string | number, [Validators.min(1800), Validators.max(new Date().getFullYear())]],
    description: ['', [Validators.required, Validators.minLength(40), Validators.maxLength(10000)]],
    ownerJobTitle: [''],
    ownerPhone: [''],
  });

  constructor() {
    effect(() => {
      const company = this.context.company();
      if (!company?.id || this.hydratedCompanyId() === company.id) return;
      this.patchCompanyForm(company);
      this.hydratedCompanyId.set(company.id);
      if (this.context.hasCompany() && !this.context.canEditCompany()) {
        this.form.disable();
      }
    });
  }

  private readonly formValues = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() }
  );

  readonly profileProgress = computed(() => {
    this.formValues();
    const raw = this.form.getRawValue();
    const hasLogo = Boolean(this.context.company()?.logoUrl || this.pendingLogoFile());
    return computeProfileProgress({
      ...raw,
      hasLogo,
      includeOwnerFields: !this.context.hasCompany(),
    });
  });

  ngOnInit(): void {
    const company = this.context.company();
    if (company) {
      this.patchCompanyForm(company);
      this.hydratedCompanyId.set(company.id);
    }

    if (this.context.hasCompany() && !this.context.canEditCompany()) {
      this.form.disable();
    }
  }

  private patchCompanyForm(company: Company): void {
    this.form.patchValue({
      name: company.name,
      legalName: company.legalName || '',
      legalForm: company.legalForm || '',
      siret: company.siret || '',
      vatNumber: company.vatNumber || '',
      streetAddress: company.streetAddress || '',
      postalCode: company.postalCode || '',
      city: company.city || '',
      country: this.resolveCountry(company.country),
      contactEmail: company.contactEmail || '',
      contactPhone: company.contactPhone || '',
      contactEmailPublic: Boolean(company.contactEmailPublic),
      contactPhonePublic: Boolean(company.contactPhonePublic),
      website: company.website || '',
      linkedinUrl: company.linkedinUrl || '',
      industry: company.industry || '',
      scaleSize: company.scaleSize || '',
      foundedYear: company.foundedYear ? String(company.foundedYear) : '',
      description: company.description || '',
    });
  }

  onLogoSelected(file: File): void {
    this.pendingLogoFile.set(file);
  }

  /** Si le pays en base n’est pas dans la liste, on l’ajoute pour l’affichage. */
  resolveCountry(value: string | null | undefined): string {
    const v = (value || DEFAULT_COUNTRY).trim();
    if (COUNTRY_OPTIONS.some((c) => c.value === v)) return v;
    return DEFAULT_COUNTRY;
  }

  extraCountryOption(): string | null {
    const v = this.form.controls.country.value?.trim();
    if (!v || COUNTRY_OPTIONS.some((c) => c.value === v)) return null;
    return v;
  }

  progressStatusLabel(): string {
    const p = this.profileProgress();
    if (p.isComplete) {
      return 'Profil complet — toutes les informations recommandées sont renseignées.';
    }
    if (p.percent >= 70) {
      return 'Presque terminé — complétez les derniers champs pour atteindre 100 %.';
    }
    if (p.percent >= 40) {
      return 'Profil en cours — continuez à renseigner votre société.';
    }
    return 'Profil incomplet — remplissez les champs pour améliorer votre visibilité.';
  }

  toggleContactEmailVisibility(): void {
    const ctrl = this.form.controls.contactEmailPublic;
    ctrl.setValue(!ctrl.value);
  }

  toggleContactPhoneVisibility(): void {
    const ctrl = this.form.controls.contactPhonePublic;
    ctrl.setValue(!ctrl.value);
  }

  hasError(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && (c.touched || this.submitted());
  }

  private buildPayload(): CompanyFormPayload {
    const raw = this.form.getRawValue();
    const siret = raw.siret.replace(/\s/g, '');
    const founded =
      raw.foundedYear === '' || raw.foundedYear === null
        ? null
        : Number(raw.foundedYear);

    return {
      name: raw.name.trim(),
      legalName: raw.legalName.trim() || null,
      legalForm: raw.legalForm || null,
      siret: siret && SIRET_PATTERN.test(siret) ? siret : null,
      vatNumber: raw.vatNumber.trim() || null,
      streetAddress: raw.streetAddress.trim() || null,
      postalCode: raw.postalCode.trim() || null,
      city: raw.city.trim(),
      country: raw.country.trim() || 'France',
      contactEmail: raw.contactEmail.trim(),
      contactPhone: raw.contactPhone.trim() || null,
      contactEmailPublic: Boolean(raw.contactEmailPublic),
      contactPhonePublic: Boolean(raw.contactPhonePublic),
      website: raw.website.trim() && URL_PATTERN.test(raw.website.trim()) ? raw.website.trim() : null,
      linkedinUrl:
        raw.linkedinUrl.trim() && URL_PATTERN.test(raw.linkedinUrl.trim())
          ? raw.linkedinUrl.trim()
          : null,
      industry: raw.industry,
      scaleSize: raw.scaleSize,
      foundedYear: Number.isFinite(founded) ? founded : null,
      description: raw.description.trim(),
      ownerJobTitle: raw.ownerJobTitle.trim() || null,
      ownerPhone: raw.ownerPhone.trim() || null,
    };
  }

  async onSubmit(): Promise<void> {
    if (this.context.hasCompany() && !this.context.canEditCompany()) {
      this.errorMessage.set('Vous n’avez pas le droit de modifier le profil entreprise.');
      return;
    }

    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const siret = this.form.controls.siret.value.replace(/\s/g, '');
    if (siret && !SIRET_PATTERN.test(siret)) {
      this.errorMessage.set('Le SIRET doit contenir exactement 14 chiffres.');
      return;
    }

    const website = this.form.controls.website.value.trim();
    if (website && !URL_PATTERN.test(website)) {
      this.errorMessage.set('Le site web doit commencer par http:// ou https://');
      return;
    }

    const linkedin = this.form.controls.linkedinUrl.value.trim();
    if (linkedin && !URL_PATTERN.test(linkedin)) {
      this.errorMessage.set('Le lien LinkedIn doit commencer par http:// ou https://');
      return;
    }

    const company = this.context.company();
    const ok = await this.confirmDialog.confirm({
      title: company?.id ? 'Mettre à jour l\'entreprise' : 'Créer l\'entreprise',
      message: company?.id
        ? 'Enregistrer les modifications du profil entreprise ?'
        : 'Créer le profil complet de votre entreprise ?',
      confirmLabel: 'Enregistrer',
    });
    if (!ok) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = this.buildPayload();

    const request$ = company?.id
      ? this.companyService.update(company.id, payload)
      : this.companyService.create(payload);

    request$.subscribe({
      next: (response) => {
        if (response.data) {
          this.context.setCompany(response.data);
          const logoFile = this.pendingLogoFile();
          if (logoFile && response.data.id) {
            this.uploadLogo(response.data.id, logoFile);
          } else {
            this.finishSave('Profil entreprise enregistré avec succès.');
          }
        }
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Échec de l\'enregistrement.');
        this.saving.set(false);
      },
    });
  }

  private uploadLogo(companyId: string, file: File): void {
    this.companyService.uploadLogo(companyId, file).subscribe({
      next: (response) => {
        if (response.data?.logoUrl) {
          this.context.updateCompanyLogo(response.data.logoUrl);
        }
        this.pendingLogoFile.set(null);
        this.finishSave('Profil entreprise et logo enregistrés.');
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          err.error?.message || 'Entreprise enregistrée, mais échec de l\'envoi du logo.'
        );
        this.saving.set(false);
      },
    });
  }

  private finishSave(message: string): void {
    this.successMessage.set(message);
    this.saving.set(false);
    this.submitted.set(false);
    this.context.loadContext().subscribe();
  }
}
