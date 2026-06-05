import { Component, inject, OnInit, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProviderContextService } from '../services/provider-context.service';
import { ProviderService } from '../services/provider.service';
import { TrainingCenterDetail } from '../../../core/models/catalog.model';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import { RichTextEditorComponent } from '../../../shared/components/rich-text-editor/rich-text-editor.component';
import { plainTextLength, sanitizeRichHtml } from '../../../shared/utils/rich-text.util';

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

  description = '';
  website = '';
  city = '';
  address = '';
  phone = '';
  email = '';
  trainingDomain = '';
  saveMsg = '';
  saveError = '';
  saving = false;
  confirmOpen = false;
  private pendingBody: Record<string, unknown> | null = null;

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
  }

  private syncFromDashboard(): void {
    const org = this.ctx.dashboard()?.organization;
    if (!org) return;
    this.description = org.description ?? '';
    this.website = org.website ?? '';
    this.city = org.city ?? '';
    this.address = org.address ?? '';
    this.phone = org.phone ?? '';
    this.email = org.email ?? '';
    if (this.ctx.isTraining) {
      this.trainingDomain = (org as TrainingCenterDetail).trainingDomain ?? '';
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
      description: sanitizeRichHtml(this.description.trim()),
      website: this.website.trim() || null,
      city: this.city.trim() || null,
      address: this.address.trim() || null,
      phone: this.phone.trim() || null,
      email: this.email.trim() || null,
    };
    if (this.ctx.isTraining) {
      body['trainingDomain'] = this.trainingDomain.trim() || null;
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
}
