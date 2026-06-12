import { Component, computed, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProviderContextService } from '../services/provider-context.service';
import { ProviderService } from '../services/provider.service';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import {
  catalogStatusLabel,
  eventTypeLabel,
} from '../../public/shared/catalog-offerings.constants';
import { offeringStatusClass } from '../shared/provider-offering.util';
import {
  paginateSlice,
  PROVIDER_LIST_PAGE_SIZE,
} from '../shared/provider-pagination.util';
import { ProviderListPaginationComponent } from '../shared/provider-list-pagination.component';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import {
  InstitutionOfferingItem,
  InstitutionOfferingStatus,
  InstitutionOfferingType,
} from '../../../core/models/catalog.model';
import { PaginationMeta } from '../../../core/models/pagination.model';

type TrainingPublicationView = 'published' | 'pending';
type TrainingPublicationKind = 'formation' | 'event';

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [RouterLink, FormsModule, ProviderListPaginationComponent],
  templateUrl: './provider-dashboard.component.html',
  styleUrls: ['../shared/provider-theme.css'],
})
export class ProviderDashboardComponent implements OnInit {
  readonly ctx = inject(ProviderContextService);
  private readonly providerService = inject(ProviderService);
  newProgramTitle = '';
  readonly routes = APP_ROUTES;
  readonly offeringStatusLabel = catalogStatusLabel;
  readonly eventTypeLabel = eventTypeLabel;
  readonly offeringStatusClass = offeringStatusClass;
  readonly pageSize = PROVIDER_LIST_PAGE_SIZE;

  readonly pubFormationsPage = signal(1);
  readonly pubEventsPage = signal(1);
  readonly draftPage = signal(1);
  readonly pendingFormationsPage = signal(1);
  readonly pendingEventsPage = signal(1);
  readonly rejectedPage = signal(1);
  readonly programsPage = signal(1);
  readonly trainingPublicationView = signal<TrainingPublicationView>('published');
  readonly trainingPublicationKind = signal<TrainingPublicationKind>('formation');
  readonly institutionOfferings = signal<InstitutionOfferingItem[]>([]);
  readonly institutionOfferingsLoading = signal(false);
  readonly institutionOfferingsError = signal<string | null>(null);
  readonly institutionOfferingsPage = signal(1);
  readonly institutionOfferingsPagination = signal<PaginationMeta | null>(null);
  readonly institutionSearch = signal('');
  readonly institutionTypeFilter = signal('');
  readonly institutionStatusFilter = signal('');

  readonly pagePublishedFormations = computed(() =>
    paginateSlice(this.ctx.publishedFormations(), this.pubFormationsPage(), this.pageSize)
  );
  readonly pagePublishedEvents = computed(() =>
    paginateSlice(this.ctx.publishedEvents(), this.pubEventsPage(), this.pageSize)
  );
  readonly pagePendingFormations = computed(() =>
    paginateSlice(this.ctx.pendingFormations(), this.pendingFormationsPage(), this.pageSize)
  );
  readonly pagePendingEvents = computed(() =>
    paginateSlice(this.ctx.pendingEvents(), this.pendingEventsPage(), this.pageSize)
  );
  readonly pageRejectedItems = computed(() => {
    const combined = [
      ...this.ctx.rejectedFormations().map((f) => ({ kind: 'formation' as const, item: f })),
      ...this.ctx.rejectedEvents().map((e) => ({ kind: 'event' as const, item: e })),
    ];
    return paginateSlice(combined, this.rejectedPage(), this.pageSize);
  });
  readonly draftItems = computed(() => [
    ...this.ctx.draftFormations().map((f) => ({ kind: 'formation' as const, item: f })),
    ...this.ctx.draftEvents().map((e) => ({ kind: 'event' as const, item: e })),
  ]);
  readonly pageDraftItems = computed(() =>
    paginateSlice(this.draftItems(), this.draftPage(), this.pageSize)
  );
  readonly pendingTotal = computed(
    () => this.ctx.pendingFormations().length + this.ctx.pendingEvents().length
  );
  readonly rejectedTotal = computed(
    () => this.ctx.rejectedFormations().length + this.ctx.rejectedEvents().length
  );
  readonly pagePrograms = computed(() =>
    paginateSlice(this.ctx.programs(), this.programsPage(), this.pageSize)
  );
  readonly pageInstitutionOfferings = computed(() => this.institutionOfferings());
  readonly institutionOfferingsTotal = computed(
    () => this.institutionOfferingsPagination()?.totalItems ?? this.institutionOfferings().length
  );

  ngOnInit(): void {
    if (!this.ctx.isTraining) {
      this.loadInstitutionOfferings();
    }
  }

  mediaUrl(url: string | null | undefined): string | null {
    return resolveUploadUrl(url ?? null);
  }

  loadInstitutionOfferings(page = this.institutionOfferingsPage()): void {
    this.institutionOfferingsLoading.set(true);
    this.institutionOfferingsError.set(null);
    this.institutionOfferingsPage.set(page);
    this.providerService.listInstitutionOfferings({
      page,
      limit: this.pageSize,
      type: this.institutionTypeFilter() ? this.institutionTypeFilter() as InstitutionOfferingType : undefined,
      status: this.institutionStatusFilter() || undefined,
      search: this.institutionSearch().trim() || undefined,
    }).subscribe({
      next: (res) => {
        this.institutionOfferings.set(res.data ?? []);
        this.institutionOfferingsPagination.set(res.pagination ?? null);
        this.institutionOfferingsLoading.set(false);
      },
      error: () => {
        this.institutionOfferingsError.set('Impossible de charger les publications.');
        this.institutionOfferingsPagination.set(null);
        this.institutionOfferingsLoading.set(false);
      },
    });
  }

  onInstitutionFilterChange(): void {
    this.loadInstitutionOfferings(1);
  }

  setInstitutionOfferingsPage(page: number): void {
    const totalPages = this.institutionOfferingsPagination()?.totalPages ?? 1;
    const next = Math.min(Math.max(page, 1), totalPages);
    if (next === this.institutionOfferingsPage() || this.institutionOfferingsLoading()) return;
    this.loadInstitutionOfferings(next);
  }

  setTrainingPublicationView(view: TrainingPublicationView): void {
    this.trainingPublicationView.set(view);
  }

  showPendingPublications(): void {
    this.trainingPublicationView.set('pending');
    this.trainingPublicationKind.set(
      this.ctx.pendingFormations().length ? 'formation' : 'event'
    );
    this.scrollToPublications();
  }

  showDrafts(): void {
    this.scrollToElement('provider-draft-offerings');
  }

  setTrainingPublicationKind(kind: string): void {
    if (kind !== 'formation' && kind !== 'event') return;
    this.trainingPublicationKind.set(kind);
    this.pubFormationsPage.set(1);
    this.pubEventsPage.set(1);
    this.pendingFormationsPage.set(1);
    this.pendingEventsPage.set(1);
  }

  institutionTypeLabel(type: InstitutionOfferingType): string {
    const labels: Record<InstitutionOfferingType, string> = {
      program: 'Programme',
      event: 'Événement',
      announcement: 'Annonce',
    };
    return labels[type];
  }

  institutionStatusLabel(status: InstitutionOfferingStatus): string {
    const labels: Record<InstitutionOfferingStatus, string> = {
      draft: 'Brouillon',
      pending: 'En attente',
      published: 'Publié',
      rejected: 'Refusé',
    };
    return labels[status];
  }

  institutionStatusClass(status: InstitutionOfferingStatus): string {
    if (status === 'published') return 'provider-pill provider-pill--ok';
    if (status === 'pending') return 'provider-pill provider-pill--warn';
    if (status === 'rejected') return 'provider-pill provider-pill--danger';
    return 'provider-pill';
  }

  setInstitutionOfferingStatus(item: InstitutionOfferingItem, status: 'draft' | 'pending'): void {
    this.providerService.updateInstitutionOffering(item.id, { status }).subscribe({
      next: () => this.loadInstitutionOfferings(),
      error: () => this.institutionOfferingsError.set('Action impossible.'),
    });
  }

  deleteFormation(id: string): void {
    this.providerService.deleteFormation(id).subscribe({
      next: () => {
        this.ctx.refreshOfferings(() => {
          this.clampPage(this.pubFormationsPage, this.ctx.publishedFormations().length);
          this.clampPage(this.pendingFormationsPage, this.ctx.pendingFormations().length);
          this.clampPage(this.draftPage, this.draftItems().length);
          this.clampPage(this.rejectedPage, this.rejectedTotal());
        });
      },
    });
  }

  deleteEvent(id: string): void {
    this.providerService.deleteEvent(id).subscribe({
      next: () => {
        this.ctx.refreshOfferings(() => {
          this.clampPage(this.pubEventsPage, this.ctx.publishedEvents().length);
          this.clampPage(this.pendingEventsPage, this.ctx.pendingEvents().length);
          this.clampPage(this.draftPage, this.draftItems().length);
          this.clampPage(this.rejectedPage, this.rejectedTotal());
        });
      },
    });
  }

  addProgram(): void {
    if (!this.newProgramTitle.trim()) return;
    this.providerService
      .addInstitutionProgram({ title: this.newProgramTitle.trim() })
      .subscribe({
        next: (res) => {
          this.ctx.programs.set(res.data ?? []);
          this.newProgramTitle = '';
          this.clampPage(this.programsPage, this.ctx.programs().length);
        },
      });
  }

  private clampPage(page: WritableSignal<number>, total: number): void {
    const maxPage = Math.max(1, Math.ceil(total / this.pageSize) || 1);
    if (page() > maxPage) {
      page.set(maxPage);
    }
  }

  private scrollToPublications(): void {
    this.scrollToElement('provider-publications-panel');
  }

  private scrollToElement(id: string): void {
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}
