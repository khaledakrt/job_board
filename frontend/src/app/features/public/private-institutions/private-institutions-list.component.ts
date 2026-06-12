import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PublicShellComponent } from '../shared/public-shell.component';
import { CatalogPageHeaderComponent } from '../shared/catalog-page-header/catalog-page-header.component';
import { PublicCatalogService } from '../services/public-catalog.service';
import { PrivateInstitutionCard } from '../../../core/models/catalog.model';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import { INSTITUTION_TYPE_OPTIONS, institutionTypeLabel } from '../shared/catalog.constants';
import { AuthService } from '../../../core/services/auth.service';
import { PaginationMeta } from '../../../core/models/pagination.model';

@Component({
  selector: 'app-private-institutions-list',
  standalone: true,
  imports: [PublicShellComponent, CatalogPageHeaderComponent, RouterLink, FormsModule],
  templateUrl: './private-institutions-list.component.html',
  styleUrl: '../shared/public-catalog.page.css',
})
export class PrivateInstitutionsListComponent implements OnInit {
  private readonly catalog = inject(PublicCatalogService);
  readonly authService = inject(AuthService);

  readonly routes = APP_ROUTES;
  readonly typeOptions = INSTITUTION_TYPE_OPTIONS;
  readonly institutionTypeLabel = institutionTypeLabel;

  readonly items = signal<PrivateInstitutionCard[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly total = signal(0);
  readonly pagination = signal<PaginationMeta | null>(null);
  readonly page = signal(1);
  readonly pageSize = 24;
  readonly totalPages = computed(() => this.pagination()?.totalPages ?? 1);

  search = '';
  city = '';
  type = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const params: Record<string, string> = {
      page: String(this.page()),
      limit: String(this.pageSize),
    };
    if (this.search.trim()) params['search'] = this.search.trim();
    if (this.city.trim()) params['city'] = this.city.trim();
    if (this.type) params['type'] = this.type;

    this.catalog.listPrivateInstitutions(params).subscribe({
      next: (res) => {
        this.items.set(res.data ?? []);
        this.total.set(res.pagination?.totalItems ?? this.items().length);
        this.pagination.set(res.pagination);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les établissements.');
        this.loading.set(false);
      },
    });
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  setPage(page: number): void {
    const next = Math.min(Math.max(1, page), this.totalPages());
    if (next === this.page() || this.loading()) return;
    this.page.set(next);
    this.load();
  }

  logoUrl(url: string | null): string | null {
    return resolveUploadUrl(url);
  }
}
