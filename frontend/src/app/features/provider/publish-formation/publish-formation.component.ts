import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ProviderService } from '../services/provider.service';
import { ProviderContextService } from '../services/provider-context.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import {
  TrainingDeliveryMode,
  ProviderParticipationItem,
  TrainingFormationItem,
} from '../../../core/models/catalog.model';
import {
  DELIVERY_MODE_FORM_OPTIONS,
  FORMATION_CATEGORY_OPTIONS,
  catalogStatusLabel,
} from '../../public/shared/catalog-offerings.constants';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import { RichTextEditorComponent } from '../../../shared/components/rich-text-editor/rich-text-editor.component';
import { sanitizeRichHtml } from '../../../shared/utils/rich-text.util';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-publish-formation',
  standalone: true,
  imports: [RouterLink, FormsModule, RichTextEditorComponent, DatePipe, TranslatePipe],
  templateUrl: './publish-formation.component.html',
  styleUrls: [
    './publish-formation.component.css',
    '../shared/provider-theme.css',
    '../shared/provider-forms.css',
  ],
})
export class PublishFormationComponent implements OnInit {
  private readonly provider = inject(ProviderService);
  private readonly ctx = inject(ProviderContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly routes = APP_ROUTES;
  readonly categories = FORMATION_CATEGORY_OPTIONS;
  readonly deliveryOptions = DELIVERY_MODE_FORM_OPTIONS;
  readonly statusLabel = catalogStatusLabel;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly formationId = signal<string | null>(null);
  readonly status = signal<string | null>(null);
  readonly participants = signal<ProviderParticipationItem[]>([]);
  readonly registeredCount = signal(0);
  readonly confirmOpen = signal(false);
  readonly maxGalleryImages = 7;
  private pendingBody: Partial<TrainingFormationItem> | null = null;
  private pendingAction: 'draft' | 'review' = 'review';

  title = '';
  category = '';
  shortDescription = '';
  description = '';
  startDate = '';
  endDate = '';
  durationLabel = '';
  city = '';
  address = '';
  deliveryMode: TrainingDeliveryMode | '' = '';
  price: number | null = null;
  certificateDelivered = false;
  seats: number | null = null;
  mainImageUrl = '';
  gallery: string[] = [];
  phone = '';
  email = '';
  website = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || id === 'nouveau') {
      this.loading.set(false);
      return;
    }
    this.formationId.set(id);
    this.provider.getFormation(id).subscribe({
      next: (res) => {
        const f = res.data;
        if (!f) {
          this.error.set('Formation introuvable.');
          this.loading.set(false);
          return;
        }
        this.patchForm(f);
        this.applyParticipants(f);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Formation introuvable.');
        this.loading.set(false);
      },
    });
  }

  private patchForm(f: {
    title: string;
    category?: string | null;
    shortDescription?: string | null;
    description?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    durationLabel?: string | null;
    city?: string | null;
    address?: string | null;
    deliveryMode?: TrainingDeliveryMode | null;
    price?: number | null;
    certificateDelivered?: boolean;
    seats?: number | null;
    mainImageUrl?: string | null;
    gallery?: string[];
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    status?: string;
  }): void {
    this.title = f.title;
    this.category = f.category ?? '';
    this.shortDescription = f.shortDescription ?? '';
    this.description = f.description ?? '';
    this.startDate = f.startDate ? String(f.startDate).slice(0, 10) : '';
    this.endDate = f.endDate ? String(f.endDate).slice(0, 10) : '';
    this.durationLabel = f.durationLabel ?? '';
    this.city = f.city ?? '';
    this.address = f.address ?? '';
    this.deliveryMode = f.deliveryMode ?? '';
    this.price = f.price ?? null;
    this.certificateDelivered = Boolean(f.certificateDelivered);
    this.seats = f.seats ?? null;
    this.mainImageUrl = f.mainImageUrl ?? '';
    this.gallery = [...(f.gallery ?? [])];
    this.phone = f.phone ?? '';
    this.email = f.email ?? '';
    this.website = f.website ?? '';
    this.status.set(f.status ?? null);
  }

  mediaUrl(url: string): string | null {
    return resolveUploadUrl(url);
  }

  onMainImage(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.provider.uploadCatalogImage(file).subscribe({
      next: (res) => {
        const url = res.data?.urls?.[0];
        if (url) this.mainImageUrl = url;
      },
    });
  }

  onGallery(event: Event): void {
    const input = event.target as HTMLInputElement;
    const remaining = this.maxGalleryImages - this.gallery.length;
    if (remaining <= 0) {
      this.error.set(`La galerie est limitée à ${this.maxGalleryImages} photos.`);
      input.value = '';
      return;
    }
    const files = Array.from(input.files ?? []).slice(0, remaining);
    if (!files.length) return;
    this.provider.uploadCatalogGallery(files).subscribe({
      next: (res) => {
        const urls = res.data?.urls ?? [];
        this.gallery = [...this.gallery, ...urls].slice(0, this.maxGalleryImages);
        input.value = '';
      },
    });
  }

  removeGallery(url: string): void {
    this.gallery = this.gallery.filter((u) => u !== url);
  }

  checklistItems(): Array<{ label: string; done: boolean }> {
    return [
      { label: 'Titre clair de la formation', done: Boolean(this.title.trim()) },
      { label: 'Catégorie renseignée', done: Boolean(this.category.trim()) },
      { label: 'Résumé visible dans le catalogue', done: Boolean(this.shortDescription.trim()) },
      { label: 'Programme détaillé ajouté', done: Boolean(sanitizeRichHtml(this.description).trim()) },
      { label: 'Date ou durée indiquée', done: Boolean(this.startDate || this.durationLabel.trim()) },
      { label: 'Ville ou modalité renseignée', done: Boolean(this.city.trim() || this.deliveryMode) },
      { label: 'Contact candidat disponible', done: Boolean(this.phone.trim() || this.email.trim()) },
      { label: 'Image principale ajoutée', done: Boolean(this.mainImageUrl.trim()) },
    ];
  }

  checklistDoneCount(): number {
    return this.checklistItems().filter((item) => item.done).length;
  }

  checklistTotal(): number {
    return this.checklistItems().length;
  }

  private applyParticipants(f: {
    participants?: ProviderParticipationItem[];
    registeredParticipants?: ProviderParticipationItem[];
    registeredCount?: number;
  }): void {
    const list = f.participants ?? f.registeredParticipants ?? [];
    this.participants.set(list);
    this.registeredCount.set(
      f.registeredCount ?? list.filter((p) => p.participationType === 'registered').length
    );
  }

  private reloadParticipants(formationId: string): void {
    this.provider.getFormation(formationId).subscribe({
      next: (res) => {
        const f = res.data;
        if (f) this.applyParticipants(f);
      },
    });
  }

  confirmTitle(): string {
    if (this.pendingAction === 'draft') return 'Enregistrer le brouillon ?';
    return this.formationId() ? 'Envoyer les modifications en validation ?' : 'Soumettre la formation ?';
  }

  confirmMessage(): string {
    if (this.pendingAction === 'draft') {
      return 'Le brouillon restera privé dans votre espace centre. Vous pourrez le compléter et l’envoyer plus tard.';
    }
    if (!this.formationId()) {
      return 'La formation sera envoyée à l’administrateur. Elle sera visible après validation.';
    }
    if (this.status() === 'rejected') {
      return 'Les modifications seront enregistrées et la formation repassera en attente de validation administrateur.';
    }
    if (this.status() === 'published') {
      return 'Les modifications seront enregistrées et la formation repassera en attente de validation administrateur avant réapparition publique.';
    }
    return 'Les modifications seront enregistrées pour cette formation.';
  }

  closeConfirm(): void {
    if (this.saving()) return;
    this.confirmOpen.set(false);
    this.pendingBody = null;
  }

  private successMessage(isEdit: boolean, previousStatus: string | null, apiMessage?: string): string {
    if (apiMessage) return apiMessage;
    if (this.pendingAction === 'draft') {
      return 'Brouillon enregistré. Vous pouvez reprendre cette formation depuis le dashboard.';
    }
    if (!isEdit) {
      return 'Formation envoyée. Elle sera visible après validation par un administrateur.';
    }
    if (previousStatus === 'rejected') {
      return 'Modifications enregistrées. La formation est à nouveau en attente de validation par l’administrateur.';
    }
    if (previousStatus === 'published') {
      return 'Modifications enregistrées. La formation repasse en attente de validation par l’administrateur.';
    }
    if (previousStatus === 'pending') {
      return 'Modifications enregistrées. La formation reste en attente de validation par l’administrateur.';
    }
    return 'Modifications enregistrées.';
  }

  private extractErrorMessage(err: unknown): string {
    const error = err as {
      error?: {
        message?: string;
        errors?: Array<{ field?: string; message?: string }>;
      };
    };
    const details = error.error?.errors
      ?.map((e) => {
        const field = e.field ? `${e.field} : ` : '';
        return `${field}${e.message ?? ''}`.trim();
      })
      .filter(Boolean);
    if (details?.length) return details.join(' | ');
    return error.error?.message ?? 'Enregistrement impossible.';
  }

  private buildBody(status: 'draft' | 'pending'): Partial<TrainingFormationItem> {
    return {
      title: this.title.trim(),
      category: this.category.trim() || null,
      shortDescription: this.shortDescription.trim() || null,
      description: sanitizeRichHtml(this.description.trim()) || null,
      startDate: this.startDate || null,
      endDate: this.endDate || null,
      durationLabel: this.durationLabel.trim() || null,
      city: this.city.trim() || null,
      address: this.address.trim() || null,
      deliveryMode: this.deliveryMode || undefined,
      price: this.price,
      certificateDelivered: this.certificateDelivered,
      seats: this.seats,
      mainImageUrl: this.mainImageUrl.trim() || null,
      gallery: this.gallery,
      phone: this.phone.trim() || null,
      email: this.email.trim() || null,
      website: this.website.trim() || null,
      status,
    };
  }

  prepareSaveDraft(): void {
    if (!this.title.trim()) {
      this.error.set('Ajoutez au minimum un titre pour enregistrer le brouillon.');
      return;
    }
    this.error.set(null);
    this.success.set(null);
    this.pendingAction = 'draft';
    this.pendingBody = this.buildBody('draft');
    this.confirmOpen.set(true);
  }

  prepareSubmitForReview(): void {
    if (!this.title.trim()) {
      this.error.set('Le titre est obligatoire avant l’envoi en validation.');
      return;
    }
    this.error.set(null);
    this.success.set(null);
    this.pendingAction = 'review';
    this.pendingBody = this.buildBody('pending');
    this.confirmOpen.set(true);
  }

  confirmSubmit(): void {
    if (!this.pendingBody) return;

    const id = this.formationId();
    const previousStatus = this.status();
    const body = this.pendingBody;
    const req =
      this.pendingAction === 'draft'
        ? this.provider.saveFormationDraft(id, body)
        : this.provider.submitFormationForReview(id, body);

    this.saving.set(true);
    req.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.confirmOpen.set(false);
        this.pendingBody = null;
        this.success.set(
          this.successMessage(Boolean(id), previousStatus, (res as { message?: string }).message)
        );
        this.ctx.refreshOfferings();
        if (!id && res.data?.id) {
          void this.router.navigateByUrl(APP_ROUTES.PROVIDER.TRAINING_FORMATION_EDIT(res.data.id));
          this.formationId.set(res.data.id);
          this.status.set(res.data.status ?? 'pending');
        } else if (id) {
          this.status.set(res.data?.status ?? this.status());
          this.reloadParticipants(id);
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.confirmOpen.set(false);
        this.error.set(this.extractErrorMessage(err));
      },
    });
  }
}
