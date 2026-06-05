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
  readonly error = signal<string | null>(null);
  readonly publicationSearch = signal('');
  readonly publicationTypeFilter = signal('');
  readonly publicationsPage = signal(1);
  readonly publicationsPageSize = 15;

  readonly allPublications = computed(() => this.item()?.institutionOfferings ?? []);
  readonly filteredPublications = computed(() => {
    const q = this.publicationSearch().trim().toLowerCase();
    const type = this.publicationTypeFilter();
    return this.allPublications().filter((pub) => {
      if (type && pub.offeringType !== type) return false;
      if (q) {
        const haystack = `${pub.title} ${pub.summary ?? ''} ${pub.category ?? ''} ${pub.city ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  });
  readonly publicationsTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredPublications().length / this.publicationsPageSize))
  );
  readonly pagedPublications = computed(() => {
    const page = Math.min(this.publicationsPage(), this.publicationsTotalPages());
    const start = (page - 1) * this.publicationsPageSize;
    return this.filteredPublications().slice(start, start + this.publicationsPageSize);
  });

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
      opportunity: item.opportunityType === 'job' ? 'Emploi' : 'Stage',
    };
    return labels[item.offeringType] ?? 'Publication';
  }

  onPublicationFilterChange(): void {
    this.publicationsPage.set(1);
  }

  setPublicationsPage(page: number): void {
    const next = Math.min(Math.max(1, page), this.publicationsTotalPages());
    this.publicationsPage.set(next);
  }
}
