import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PublicShellComponent } from '../shared/public-shell.component';
import { PublicCatalogService } from '../services/public-catalog.service';
import { TrainingCenterDetail } from '../../../core/models/catalog.model';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import { SafeHtmlComponent } from '../../../shared/components/safe-html/safe-html.component';
import { deliveryModeLabel } from '../shared/catalog.constants';
import {
  eventTypeLabel,
} from '../shared/catalog-offerings.constants';
import { TrainingFormationItem, TrainingEventItem } from '../../../core/models/catalog.model';

@Component({
  selector: 'app-training-center-detail',
  standalone: true,
  imports: [PublicShellComponent, RouterLink, FormsModule, SafeHtmlComponent],
  templateUrl: './training-center-detail.component.html',
  styleUrl: '../shared/public-catalog.page.css',
})
export class TrainingCenterDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(PublicCatalogService);

  readonly routes = APP_ROUTES;
  readonly deliveryModeLabel = deliveryModeLabel;
  readonly eventTypeLabel = eventTypeLabel;

  readonly center = signal<TrainingCenterDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly offeringKindFilter = signal<'all' | 'formation' | 'event'>('all');
  readonly offeringSearch = signal('');
  readonly offeringsPage = signal(1);
  readonly offeringsPageSize = 15;

  readonly offeringCards = computed(() => {
    const center = this.center();
    if (!center) return [];

    const formations = (center.formations ?? []).map((f) => ({
      kind: 'formation' as const,
      id: f.id,
      title: f.title,
      imageUrl: f.mainImageUrl ?? null,
      placeholder: 'Formation',
      primaryTag: f.category ?? null,
      secondaryTag: f.city ?? null,
      description: f.shortDescription ?? null,
      price: f.price,
      participantsCount: f.participantsCount,
      meta: this.formationMeta(f),
      route: this.routes.PUBLIC.FORMATION(f.id),
      cta: 'Voir la formation →',
    }));

    const events = (center.events ?? []).map((ev) => ({
      kind: 'event' as const,
      id: ev.id,
      title: ev.title,
      imageUrl: ev.posterImageUrl ?? null,
      placeholder: 'Événement',
      primaryTag: this.eventTypeLabel(ev.eventType),
      secondaryTag: ev.city ?? null,
      description: null,
      price: ev.price,
      participantsCount: ev.participantsCount,
      meta: this.eventMeta(ev),
      route: this.routes.PUBLIC.EVENT(ev.id),
      cta: "Voir l'événement →",
    }));

    return [...formations, ...events];
  });

  readonly filteredOfferingCards = computed(() => {
    const kind = this.offeringKindFilter();
    const q = this.offeringSearch().trim().toLowerCase();
    return this.offeringCards().filter((item) => {
      if (kind !== 'all' && item.kind !== kind) return false;
      if (q && !item.title.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  readonly pagedOfferingCards = computed(() => {
    const start = (this.offeringsPage() - 1) * this.offeringsPageSize;
    return this.filteredOfferingCards().slice(start, start + this.offeringsPageSize);
  });

  readonly offeringsTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredOfferingCards().length / this.offeringsPageSize))
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Centre introuvable.');
      this.loading.set(false);
      return;
    }
    this.catalog.getTrainingCenter(id).subscribe({
      next: (res) => {
        this.center.set(res.data ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Centre introuvable ou non publié.');
        this.loading.set(false);
      },
    });
  }

  mediaUrl(url: string | null | undefined): string | null {
    return resolveUploadUrl(url ?? null);
  }

  onOfferingsFilterChange(): void {
    this.offeringsPage.set(1);
  }

  setOfferingsPage(page: number): void {
    const next = Math.min(Math.max(page, 1), this.offeringsTotalPages());
    this.offeringsPage.set(next);
  }

  formatPrice(price: number | null | undefined): string | null {
    if (price == null || Number.isNaN(price)) return null;
    return `${price.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} TND`;
  }

  formationMeta(f: TrainingFormationItem): string {
    const parts: string[] = [];
    if (f.durationLabel) parts.push(f.durationLabel);
    if (f.startDate) {
      const d = f.startDate.slice(0, 10).split('-').reverse().join('/');
      parts.push(f.endDate ? `Du ${d}` : `À partir du ${d}`);
    }
    if (f.deliveryMode) parts.push(this.deliveryModeLabel(f.deliveryMode));
    return parts.join(' · ');
  }

  eventMeta(ev: TrainingEventItem): string {
    const parts: string[] = [];
    if (ev.eventDate) {
      let d = ev.eventDate.slice(0, 10).split('-').reverse().join('/');
      if (ev.startTime) d += ` ${ev.startTime.slice(0, 5)}`;
      parts.push(d);
    }
    if (ev.city) parts.push(ev.city);
    return parts.join(' · ');
  }
}
