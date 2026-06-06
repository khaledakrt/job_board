import { Component, inject, OnInit, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProviderContextService } from '../services/provider-context.service';
import { ProviderService } from '../services/provider.service';
import { InstitutionType, PrivateInstitutionDetail, TrainingCenterDetail } from '../../../core/models/catalog.model';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import { RichTextEditorComponent } from '../../../shared/components/rich-text-editor/rich-text-editor.component';
import { plainTextLength, sanitizeRichHtml } from '../../../shared/utils/rich-text.util';
import { AuthService } from '../../../core/services/auth.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';

const INSTITUTION_TYPE_OPTIONS: { value: InstitutionType; label: string }[] = [
  { value: 'primary', label: 'École primaire' },
  { value: 'college', label: 'Collège' },
  { value: 'high_school', label: 'Lycée' },
  { value: 'higher_institute', label: 'Institut supérieur' },
  { value: 'university', label: 'Université' },
  { value: 'academy', label: 'Académie / école spécialisée' },
];

@Component({
  selector: 'app-provider-profile',
  standalone: true,
  imports: [FormsModule, RichTextEditorComponent],
  templateUrl: './provider-profile.component.html',
  styleUrls: [
    '../shared/provider-theme.css',
    '../shared/provider-forms.css',
    '../publish-formation/publish-formation.component.css',
  ],
})
export class ProviderProfileComponent implements OnInit {
  readonly ctx = inject(ProviderContextService);
  private readonly providerService = inject(ProviderService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly institutionTypeOptions = INSTITUTION_TYPE_OPTIONS;

  name = '';
  description = '';
  website = '';
  city = '';
  address = '';
  phone = '';
  email = '';
  trainingDomain = '';
  institutionType: InstitutionType = 'high_school';
  saveMsg = '';
  saveError = '';
  saving = false;
  confirmOpen = false;
  private pendingBody: Record<string, unknown> | null = null;

  accountEmail = '';
  accountEmailConfirm = '';
  accountEmailPassword = '';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  accountSaving = false;
  accountMsg = '';
  accountError = '';
  showAccountForm = false;
  accountConfirmOpen = false;
  private pendingAccountAction: 'email' | 'password' | null = null;

  get accountOnly(): boolean {
    return this.route.snapshot.data['accountOnly'] === true;
  }

  descriptionPlainLen(): number {
    return plainTextLength(this.description);
  }

  constructor() {
    effect(() => {
      this.syncFromDashboard();
    });
  }

  ngOnInit(): void {
    this.syncFromDashboard();
    if (this.accountOnly) {
      this.showAccountForm = true;
    }
    this.route.queryParamMap.subscribe((params) => {
      if (this.accountOnly || params.get('section') === 'personal-info') {
        this.showAccountForm = true;
        setTimeout(() => {
          document
            .getElementById('personal-info-form')
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
    });
  }

  private syncFromDashboard(): void {
    const org = this.ctx.dashboard()?.organization;
    if (!org) return;
    this.name = org.name ?? '';
    this.description = org.description ?? '';
    this.website = org.website ?? '';
    this.city = org.city ?? '';
    this.address = org.address ?? '';
    this.phone = org.phone ?? '';
    this.email = org.email ?? '';
    if (this.ctx.isTraining) {
      this.trainingDomain = (org as TrainingCenterDetail).trainingDomain ?? '';
    } else {
      this.institutionType = (org as PrivateInstitutionDetail).institutionType ?? 'high_school';
    }
  }

  mediaUrl(url: string | null | undefined): string | null {
    return resolveUploadUrl(url ?? null);
  }

  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const req = this.ctx.isTraining
      ? this.providerService.uploadTrainingLogo(file)
      : this.providerService.uploadInstitutionLogo(file);
    req.subscribe({ next: () => this.ctx.load() });
  }

  onBrochureSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const req = this.ctx.isTraining
      ? this.providerService.uploadTrainingBrochure(file)
      : this.providerService.uploadInstitutionBrochure(file);
    req.subscribe({ next: () => this.ctx.load() });
  }

  closeConfirm(): void {
    if (this.saving) return;
    this.confirmOpen = false;
    this.pendingBody = null;
  }

  saveProfile(): void {
    const body: Record<string, unknown> = {
      name: this.name.trim(),
      description: sanitizeRichHtml(this.description.trim()),
      website: this.website.trim() || null,
      city: this.city.trim() || null,
      address: this.address.trim() || null,
      phone: this.phone.trim() || null,
      email: this.email.trim() || null,
    };
    if (this.ctx.isTraining) {
      body['trainingDomain'] = this.trainingDomain.trim() || null;
    } else {
      body['institutionType'] = this.institutionType;
    }
    this.saveMsg = '';
    this.saveError = '';
    this.pendingBody = body;
    this.confirmOpen = true;
  }

  confirmSaveProfile(): void {
    if (!this.pendingBody) return;

    const body = this.pendingBody;
    const req = this.ctx.isTraining
      ? this.providerService.updateTrainingProfile(body)
      : this.providerService.updateInstitutionProfile(body);
    this.saving = true;
    req.subscribe({
      next: (res) => {
        this.saving = false;
        this.confirmOpen = false;
        this.pendingBody = null;
        this.ctx.dashboard.set(res.data ?? null);
        const status = res.data?.accountStatus;
        this.saveMsg =
          status === 'published'
            ? 'Profil enregistré. Votre fiche publique est mise à jour.'
            : 'Profil enregistré. Votre compte reste en attente de validation administrateur.';
        setTimeout(() => (this.saveMsg = ''), 4000);
      },
      error: (err) => {
        this.saving = false;
        this.confirmOpen = false;
        this.saveError = err.error?.message ?? 'Enregistrement impossible.';
      },
    });
  }

  toggleAccountForm(): void {
    this.showAccountForm = !this.showAccountForm;
    this.accountMsg = '';
    this.accountError = '';
  }

  cancelAccountForm(): void {
    if (this.accountSaving) return;
    this.showAccountForm = this.accountOnly;
    this.accountConfirmOpen = false;
    this.pendingAccountAction = null;
    this.accountEmail = '';
    this.accountEmailConfirm = '';
    this.accountEmailPassword = '';
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.accountError = '';
    if (!this.accountOnly) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { section: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  closeAccountConfirm(): void {
    if (this.accountSaving) return;
    this.accountConfirmOpen = false;
    this.pendingAccountAction = null;
  }

  prepareAccountSave(): void {
    const wantsEmailChange = Boolean(
      this.accountEmail.trim() || this.accountEmailConfirm.trim() || this.accountEmailPassword
    );
    const wantsPasswordChange = Boolean(this.currentPassword || this.newPassword || this.confirmPassword);
    this.accountMsg = '';
    this.accountError = '';

    if (!wantsEmailChange && !wantsPasswordChange) {
      this.accountError = 'Aucune modification à enregistrer.';
      return;
    }

    if (wantsEmailChange && wantsPasswordChange) {
      this.accountError = 'Modifiez l’e-mail ou le mot de passe séparément.';
      return;
    }

    if (wantsEmailChange) {
      const nextEmail = this.accountEmail.trim().toLowerCase();
      const confirmEmail = this.accountEmailConfirm.trim().toLowerCase();
      if (!nextEmail || nextEmail !== confirmEmail || !this.accountEmailPassword) {
        this.accountError = 'Saisissez la nouvelle adresse, sa confirmation et votre mot de passe actuel.';
        return;
      }
      this.pendingAccountAction = 'email';
    } else {
      if (!this.currentPassword || !this.newPassword || this.newPassword !== this.confirmPassword) {
        this.accountError = 'Saisissez le mot de passe actuel et confirmez correctement le nouveau mot de passe.';
        return;
      }
      this.pendingAccountAction = 'password';
    }

    this.accountConfirmOpen = true;
  }

  confirmAccountSave(): void {
    if (this.pendingAccountAction === 'email') {
      this.changeAccountEmail();
      return;
    }
    if (this.pendingAccountAction === 'password') {
      this.changeAccountPassword();
    }
  }

  private changeAccountEmail(): void {
    const nextEmail = this.accountEmail.trim().toLowerCase();
    const confirmEmail = this.accountEmailConfirm.trim().toLowerCase();
    this.accountMsg = '';
    this.accountError = '';

    if (!nextEmail || nextEmail !== confirmEmail || !this.accountEmailPassword) {
      this.accountError = 'Saisissez la nouvelle adresse, sa confirmation et votre mot de passe actuel.';
      return;
    }

    this.accountSaving = true;
    this.authService
      .changeEmail({
        newEmail: nextEmail,
        confirmNewEmail: confirmEmail,
        currentPassword: this.accountEmailPassword,
      })
      .subscribe({
        next: () => {
          this.accountSaving = false;
          this.accountConfirmOpen = false;
          this.pendingAccountAction = null;
          this.accountMsg = 'Adresse e-mail modifiée. Reconnectez-vous après vérification si nécessaire.';
          this.accountEmail = '';
          this.accountEmailConfirm = '';
          this.accountEmailPassword = '';
          setTimeout(() => void this.router.navigate([APP_ROUTES.AUTH.LOGIN]), 1200);
        },
        error: (err) => {
          this.accountSaving = false;
          this.accountConfirmOpen = false;
          this.accountError = err.error?.message ?? 'Modification de l’e-mail impossible.';
        },
      });
  }

  private changeAccountPassword(): void {
    this.accountMsg = '';
    this.accountError = '';

    if (!this.currentPassword || !this.newPassword || this.newPassword !== this.confirmPassword) {
      this.accountError = 'Saisissez le mot de passe actuel et confirmez correctement le nouveau mot de passe.';
      return;
    }

    this.accountSaving = true;
    this.authService
      .changePassword({
        currentPassword: this.currentPassword,
        newPassword: this.newPassword,
      })
      .subscribe({
        next: () => {
          this.accountSaving = false;
          this.accountConfirmOpen = false;
          this.pendingAccountAction = null;
          this.accountMsg = 'Mot de passe modifié. Reconnectez-vous avec le nouveau mot de passe.';
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          setTimeout(() => void this.router.navigate([APP_ROUTES.AUTH.LOGIN]), 1200);
        },
        error: (err) => {
          this.accountSaving = false;
          this.accountConfirmOpen = false;
          this.accountError = err.error?.message ?? 'Modification du mot de passe impossible.';
        },
      });
  }
}
