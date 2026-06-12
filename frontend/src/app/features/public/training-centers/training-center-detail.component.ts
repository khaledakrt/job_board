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
import { PaginationMeta } from '../../../core/models/pagination.model';

type OfferingKindFilter = 'formation' | 'event';

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
  readonly offeringsLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly offeringKindFilter = signal<OfferingKindFilter>('formation');
  readonly offeringSearch = signal('');
  readonly offeringsPage = signal(1);
  readonly offeringsPageSize = 15;
  readonly offeringsPagination = signal<PaginationMeta | null>(null);

  readonly offeringCards = signal<Array<{
    kind: OfferingKindFilter;
    id: string;
    title: string;
    imageUrl: string | null;
    placeholder: string;
    primaryTag: string | null;
    secondaryTag: string | null;
    description: string | null;
    price: number | null | undefined;
    participantsCount: number | null | undefined;
    meta: string;
    route: string;
    cta: string;
  }>>([]);

  private formationCards(items: TrainingFormationItem[]) {
    return items.map((f) => ({
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
  }

  private eventCards(items: TrainingEventItem[]) {
    return items.map((ev) => ({
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
  }

  readonly pagedOfferingCards = computed(() => {
    return this.offeringCards();
  });

  readonly offeringsTotalPages = computed(() =>
    this.offeringsPagination()?.totalPages ?? 1
  );

  readonly offeringsTotal = computed(() => this.offeringsPagination()?.totalItems ?? this.offeringCards().length);

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
        this.loadOfferings(1);
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
    this.loadOfferings(1);
  }

  setOfferingsPage(page: number): void {
    const next = Math.min(Math.max(page, 1), this.offeringsTotalPages());
    this.loadOfferings(next);
  }

  setOfferingKindFilter(kind: string): void {
    if (kind !== 'formation' && kind !== 'event') return;
    this.offeringKindFilter.set(kind);
    this.loadOfferings(1);
  }

  private loadOfferings(page: number): void {
    const centerId = this.center()?.id;
    if (!centerId) return;
    this.offeringsLoading.set(true);
    this.offeringsPage.set(page);
    const params: Record<string, string | number> = {
      page,
      limit: this.offeringsPageSize,
    };
    if (this.offeringSearch().trim()) {
      params['search'] = this.offeringSearch().trim();
    }

    if (this.offeringKindFilter() === 'formation') {
      this.catalog.listCenterFormations(centerId, params).subscribe({
        next: (res) => {
          this.offeringCards.set(this.formationCards(res.data ?? []));
          this.offeringsPagination.set(res.pagination ?? null);
          this.offeringsLoading.set(false);
        },
        error: () => this.handleOfferingsLoadError(),
      });
      return;
    }

    this.catalog.listCenterEvents(centerId, params).subscribe({
      next: (res) => {
        this.offeringCards.set(this.eventCards(res.data ?? []));
        this.offeringsPagination.set(res.pagination ?? null);
        this.offeringsLoading.set(false);
      },
      error: () => this.handleOfferingsLoadError(),
    });
  }

  private handleOfferingsLoadError(): void {
    this.offeringCards.set([]);
    this.offeringsPagination.set(null);
    this.offeringsLoading.set(false);
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
