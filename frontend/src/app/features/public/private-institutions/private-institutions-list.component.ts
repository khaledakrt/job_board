import { Component, inject, OnInit, signal } from '@angular/core';
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

  search = '';
  city = '';
  type = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const params: Record<string, string> = { page: '1', limit: '24' };
    if (this.search.trim()) params['search'] = this.search.trim();
    if (this.city.trim()) params['city'] = this.city.trim();
    if (this.type) params['type'] = this.type;

    this.catalog.listPrivateInstitutions(params).subscribe({
      next: (res) => {
        this.items.set(res.data ?? []);
        this.total.set(res.pagination?.totalItems ?? this.items().length);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les établissements.');
        this.loading.set(false);
      },
    });
  }

  logoUrl(url: string | null): string | null {
    return resolveUploadUrl(url);
  }
}
