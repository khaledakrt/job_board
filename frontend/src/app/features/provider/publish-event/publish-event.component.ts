import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ProviderService } from '../services/provider.service';
import { ProviderContextService } from '../services/provider-context.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import {
  ProviderParticipationItem,
  TrainingEventItem,
  TrainingEventType,
} from '../../../core/models/catalog.model';
import {
  TRAINING_EVENT_TYPE_OPTIONS,
  catalogStatusLabel,
} from '../../public/shared/catalog-offerings.constants';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import { RichTextEditorComponent } from '../../../shared/components/rich-text-editor/rich-text-editor.component';
import { sanitizeRichHtml } from '../../../shared/utils/rich-text.util';

@Component({
  selector: 'app-publish-event',
  standalone: true,
  imports: [RouterLink, FormsModule, RichTextEditorComponent, DatePipe],
  templateUrl: './publish-event.component.html',
  styleUrls: [
    './publish-event.component.css',
    '../shared/provider-theme.css',
    '../shared/provider-forms.css',
  ],
})
export class PublishEventComponent implements OnInit {
  private readonly provider = inject(ProviderService);
  private readonly ctx = inject(ProviderContextService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly routes = APP_ROUTES;
  readonly eventTypes = TRAINING_EVENT_TYPE_OPTIONS;
  readonly statusLabel = catalogStatusLabel;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly eventId = signal<string | null>(null);
  readonly status = signal<string | null>(null);
  readonly participants = signal<ProviderParticipationItem[]>([]);
  readonly registeredCount = signal(0);
  readonly confirmOpen = signal(false);
  private pendingBody: Partial<TrainingEventItem> | null = null;

  title = '';
  eventType: TrainingEventType = 'workshop';
  description = '';
  eventDate = '';
  startTime = '';
  endTime = '';
  city = '';
  address = '';
  price: number | null = null;
  seats: number | null = null;
  posterImageUrl = '';
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
    this.eventId.set(id);
    this.provider.getEvent(id).subscribe({
      next: (res) => {
        const e = res.data;
        if (!e) {
          this.error.set('Événement introuvable.');
          this.loading.set(false);
          return;
        }
        this.patchForm(e);
        this.applyParticipants(e);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Événement introuvable.');
        this.loading.set(false);
      },
    });
  }

  private patchForm(e: {
    title: string;
    eventType: TrainingEventType;
    description?: string | null;
    eventDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    city?: string | null;
    address?: string | null;
    price?: number | null;
    seats?: number | null;
    posterImageUrl?: string | null;
    gallery?: string[];
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    status?: string;
  }): void {
    this.title = e.title;
    this.eventType = e.eventType;
    this.description = e.description ?? '';
    this.eventDate = e.eventDate ? String(e.eventDate).slice(0, 10) : '';
    this.startTime = e.startTime ? String(e.startTime).slice(0, 5) : '';
    this.endTime = e.endTime ? String(e.endTime).slice(0, 5) : '';
    this.city = e.city ?? '';
    this.address = e.address ?? '';
    this.price = e.price ?? null;
    this.seats = e.seats ?? null;
    this.posterImageUrl = e.posterImageUrl ?? '';
    this.gallery = [...(e.gallery ?? [])];
    this.phone = e.phone ?? '';
    this.email = e.email ?? '';
    this.website = e.website ?? '';
    this.status.set(e.status ?? null);
  }

  mediaUrl(url: string): string | null {
    return resolveUploadUrl(url);
  }

  onPoster(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.provider.uploadCatalogImage(file).subscribe({
      next: (res) => {
        const url = res.data?.urls?.[0];
        if (url) this.posterImageUrl = url;
      },
    });
  }

  onGallery(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (!files.length) return;
    this.provider.uploadCatalogGallery(files).subscribe({
      next: (res) => {
        const urls = res.data?.urls ?? [];
        this.gallery = [...this.gallery, ...urls].slice(0, 8);
      },
    });
  }

  removeGallery(url: string): void {
    this.gallery = this.gallery.filter((u) => u !== url);
  }

  private applyParticipants(e: {
    participants?: ProviderParticipationItem[];
    registeredParticipants?: ProviderParticipationItem[];
    registeredCount?: number;
  }): void {
    const list = e.participants ?? e.registeredParticipants ?? [];
    this.participants.set(list);
    this.registeredCount.set(
      e.registeredCount ?? list.filter((p) => p.participationType === 'registered').length
    );
  }

  private reloadParticipants(eventId: string): void {
    this.provider.getEvent(eventId).subscribe({
      next: (res) => {
        const e = res.data;
        if (e) this.applyParticipants(e);
      },
    });
  }

  confirmTitle(): string {
    return this.eventId() ? 'Confirmer les modifications' : 'Soumettre l’événement ?';
  }

  confirmMessage(): string {
    if (!this.eventId()) {
      return 'L’événement sera envoyé à l’administrateur. Il sera visible après validation.';
    }
    if (this.status() === 'rejected') {
      return 'Les modifications seront enregistrées et l’événement repassera en attente de validation administrateur.';
    }
    return 'Les modifications seront enregistrées pour cet événement.';
  }

  closeConfirm(): void {
    if (this.saving()) return;
    this.confirmOpen.set(false);
    this.pendingBody = null;
  }

  private successMessage(isEdit: boolean, previousStatus: string | null, apiMessage?: string): string {
    if (apiMessage) return apiMessage;
    if (!isEdit) {
      return 'Événement envoyé. Il sera visible après validation par un administrateur.';
    }
    if (previousStatus === 'rejected') {
      return 'Modifications enregistrées. L’événement est à nouveau en attente de validation par l’administrateur.';
    }
    if (previousStatus === 'pending') {
      return 'Modifications enregistrées. L’événement reste en attente de validation par l’administrateur.';
    }
    return 'Modifications enregistrées.';
  }

  submit(): void {
    if (!this.title.trim()) {
      this.error.set('Le titre est obligatoire.');
      return;
    }
    this.error.set(null);
    this.success.set(null);

    this.pendingBody = {
      title: this.title.trim(),
      eventType: this.eventType,
      description: sanitizeRichHtml(this.description.trim()) || null,
      eventDate: this.eventDate || null,
      startTime: this.startTime || null,
      endTime: this.endTime || null,
      city: this.city.trim() || null,
      address: this.address.trim() || null,
      price: this.price,
      seats: this.seats,
      posterImageUrl: this.posterImageUrl.trim() || null,
      gallery: this.gallery,
      phone: this.phone.trim() || null,
      email: this.email.trim() || null,
      website: this.website.trim() || null,
    };
    this.confirmOpen.set(true);
  }

  confirmSubmit(): void {
    if (!this.pendingBody) return;

    const id = this.eventId();
    const previousStatus = this.status();
    const body = this.pendingBody;
    const req = id ? this.provider.updateEvent(id, body) : this.provider.createEvent(body);

    this.saving.set(true);
    req.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.confirmOpen.set(false);
        this.pendingBody = null;
        this.success.set(this.successMessage(Boolean(id), previousStatus, (res as ApiMessage).message));
        this.ctx.refreshOfferings();
        if (!id && res.data?.id) {
          void this.router.navigateByUrl(APP_ROUTES.PROVIDER.TRAINING_EVENT_EDIT(res.data.id));
          this.eventId.set(res.data.id);
          this.status.set(res.data.status ?? 'pending');
        } else if (id) {
          this.status.set(res.data?.status ?? this.status());
          this.reloadParticipants(id);
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.confirmOpen.set(false);
        this.error.set(err.error?.message ?? 'Enregistrement impossible.');
      },
    });
  }
}

interface ApiMessage {
  message?: string;
}
