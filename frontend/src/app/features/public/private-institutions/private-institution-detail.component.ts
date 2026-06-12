import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PublicShellComponent } from '../shared/public-shell.component';
import { PublicCatalogService } from '../services/public-catalog.service';
import { PrivateInstitutionDetail } from '../../../core/models/catalog.model';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import { SafeHtmlComponent } from '../../../shared/components/safe-html/safe-html.component';
import { institutionTypeLabel } from '../shared/catalog.constants';
import { InstitutionOfferingItem } from '../../../core/models/catalog.model';
import { PaginationMeta } from '../../../core/models/pagination.model';

@Component({
  selector: 'app-private-institution-detail',
  standalone: true,
  imports: [PublicShellComponent, RouterLink, SafeHtmlComponent, FormsModule],
  templateUrl: './private-institution-detail.component.html',
  styleUrl: '../shared/public-catalog.page.css',
})
export class PrivateInstitutionDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(PublicCatalogService);

  readonly routes = APP_ROUTES;
  readonly institutionTypeLabel = institutionTypeLabel;

  readonly item = signal<PrivateInstitutionDetail | null>(null);
  readonly loading = signal(true);
  readonly publicationsLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly publications = signal<InstitutionOfferingItem[]>([]);
  readonly publicationsPagination = signal<PaginationMeta | null>(null);
  readonly publicationSearch = signal('');
  readonly publicationTypeFilter = signal('');
  readonly publicationsPage = signal(1);
  readonly publicationsPageSize = 15;

  readonly publicationsTotal = computed(() => this.publicationsPagination()?.totalItems ?? this.publications().length);
  readonly publicationsTotalPages = computed(() => this.publicationsPagination()?.totalPages ?? 1);
  readonly pagedPublications = computed(() => this.publications());

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Établissement introuvable.');
      this.loading.set(false);
      return;
    }
    this.catalog.getPrivateInstitution(id).subscribe({
      next: (res) => {
        this.item.set(res.data ?? null);
        this.loading.set(false);
        this.loadPublications();
      },
      error: () => {
        this.error.set('Établissement introuvable ou non publié.');
        this.loading.set(false);
      },
    });
  }

  mediaUrl(url: string | null): string | null {
    return resolveUploadUrl(url);
  }

  offeringDate(item: InstitutionOfferingItem): string {
    const start = item.startDate ? new Date(item.startDate).toLocaleDateString('fr-FR') : '';
    const end = item.endDate ? new Date(item.endDate).toLocaleDateString('fr-FR') : '';
    if (start && end && start !== end) return `${start} - ${end}`;
    return start || end || '';
  }

  publicationTypeLabel(item: InstitutionOfferingItem): string {
    const labels: Record<string, string> = {
      program: 'Programme',
      event: 'Événement',
      announcement: 'Annonce',
    };
    return labels[item.offeringType] ?? 'Publication';
  }

  onPublicationFilterChange(): void {
    this.publicationsPage.set(1);
    this.loadPublications();
  }

  setPublicationsPage(page: number): void {
    const next = Math.min(Math.max(1, page), this.publicationsTotalPages());
    if (next === this.publicationsPage() || this.publicationsLoading()) return;
    this.publicationsPage.set(next);
    this.loadPublications();
  }

  private loadPublications(): void {
    const id = this.item()?.id;
    if (!id) return;
    const params: Record<string, string | number> = {
      page: this.publicationsPage(),
      limit: this.publicationsPageSize,
    };
    if (this.publicationTypeFilter()) params['type'] = this.publicationTypeFilter();
    if (this.publicationSearch().trim()) params['search'] = this.publicationSearch().trim();

    this.publicationsLoading.set(true);
    this.catalog.listPrivateInstitutionOfferings(id, params).subscribe({
      next: (res) => {
        this.publications.set(res.data ?? []);
        this.publicationsPagination.set(res.pagination);
        this.publicationsLoading.set(false);
      },
      error: () => {
        this.publications.set([]);
        this.publicationsPagination.set(null);
        this.publicationsLoading.set(false);
      },
    });
  }
}
