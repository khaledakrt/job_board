import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PublicShellComponent } from '../shared/public-shell.component';
import { CatalogPageHeaderComponent } from '../shared/catalog-page-header/catalog-page-header.component';
import { PublicCatalogService } from '../services/public-catalog.service';
import { TrainingCenterCard } from '../../../core/models/catalog.model';
import { APP_ROUTES } from '../../../core/constants/routes.constant';
import { resolveUploadUrl } from '../../../core/utils/asset-url.util';
import { TRAINING_DELIVERY_OPTIONS, deliveryModeLabel } from '../shared/catalog.constants';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-training-centers-list',
  standalone: true,
  imports: [PublicShellComponent, CatalogPageHeaderComponent, RouterLink, FormsModule],
  templateUrl: './training-centers-list.component.html',
  styleUrl: '../shared/public-catalog.page.css',
})
export class TrainingCentersListComponent implements OnInit {
  private readonly catalog = inject(PublicCatalogService);
  readonly authService = inject(AuthService);

  readonly routes = APP_ROUTES;
  readonly deliveryOptions = TRAINING_DELIVERY_OPTIONS;
  readonly deliveryModeLabel = deliveryModeLabel;

  readonly items = signal<TrainingCenterCard[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly total = signal(0);

  search = '';
  city = '';
  domain = '';
  deliveryMode = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const params: Record<string, string> = { page: '1', limit: '24' };
    if (this.search.trim()) params['search'] = this.search.trim();
    if (this.city.trim()) params['city'] = this.city.trim();
    if (this.domain.trim()) params['domain'] = this.domain.trim();
    if (this.deliveryMode) params['deliveryMode'] = this.deliveryMode;

    this.catalog.listTrainingCenters(params).subscribe({
      next: (res) => {
        this.items.set(res.data ?? []);
        this.total.set(res.pagination?.totalItems ?? this.items().length);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les centres de formation.');
        this.loading.set(false);
      },
    });
  }

  logoUrl(url: string | null): string | null {
    return resolveUploadUrl(url);
  }
}
